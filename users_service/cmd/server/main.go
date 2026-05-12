package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mehdii000/SocialPlatform/users_service/internal/config"
	"github.com/mehdii000/SocialPlatform/users_service/internal/handler"
	"github.com/mehdii000/SocialPlatform/users_service/internal/middleware"
	"github.com/mehdii000/SocialPlatform/users_service/internal/repository"
	"github.com/mehdii000/SocialPlatform/users_service/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Error("failed to ping database", "error", err)
		os.Exit(1)
	}
	logger.Info("connected to social_db")

	if err := repository.RunMigrations(ctx, pool); err != nil {
		logger.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}
	logger.Info("migrations complete")

	storage, err := repository.NewMinioStorage(cfg.MinioEndpoint, cfg.MinioAccessKey, cfg.MinioSecretKey, cfg.MinioBucket)
	if err != nil {
		logger.Error("failed to initialize MinIO", "error", err)
		os.Exit(1)
	}
	logger.Info("connected to MinIO")

	profileRepo := repository.NewProfileRepo(pool)
	followRepo := repository.NewFollowRepo(pool)
	svc := service.NewUsersService(profileRepo, followRepo, storage)
	h := handler.NewUsersHandler(svc, logger)

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.UserIDFromGateway)

	r.Get("/health", h.Health)
	r.Get("/ready", h.Ready)

	r.Route("/profiles", func(r chi.Router) {
		r.Get("/get", h.GetProfile)
		r.Put("/update", h.UpdateProfile)
		r.Get("/getpublic", h.GetPublicProfile)
	})

	r.Post("/changeprofilepic", h.UploadAvatar)
	r.Get("/getusers", h.ListUsers)
	r.Get("/search", h.SearchUsers)
	r.Post("/internal/createuser", h.CreateUser)

	r.Post("/{id}/follow", h.Follow)
	r.Delete("/{id}/follow", h.Unfollow)
	r.Get("/{id}/followers", h.GetFollowers)
	r.Get("/{id}/following", h.GetFollowing)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("starting users_service", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()
	srv.Shutdown(shutdownCtx)
	pool.Close()

	logger.Info("server stopped")
}
