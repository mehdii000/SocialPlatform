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

	"github.com/mehdii000/SocialPlatform/resonance_service/internal/config"
	"github.com/mehdii000/SocialPlatform/resonance_service/internal/handler"
	"github.com/mehdii000/SocialPlatform/resonance_service/internal/middleware"
	"github.com/mehdii000/SocialPlatform/resonance_service/internal/repository"
	"github.com/mehdii000/SocialPlatform/resonance_service/internal/service"
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

	topicRepo := repository.NewTopicRepo(pool)
	postTopicRepo := repository.NewPostTopicRepo(pool)
	interestRepo := repository.NewInterestRepo(pool)
	svc := service.NewResonanceService(topicRepo, postTopicRepo, interestRepo)
	h := handler.NewResonanceHandler(svc, logger)

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.UserIDFromGateway)

	r.Get("/health", h.Health)
	r.Get("/ready", h.Ready)

	// Topic routes
	r.Get("/topics", h.ListTopics)
	r.Get("/topics/trending", h.GetTrendingTopics)
	r.Get("/topics/{slug}", h.GetTopic)
	r.Get("/topics/{slug}/posts", h.GetTopicPosts)
	r.Post("/topics/{slug}/follow", h.FollowTopic)
	r.Delete("/topics/{slug}/follow", h.UnfollowTopic)

	// Feed route
	r.Get("/feed/for-you", h.GetForYouFeed)

	// Interest routes
	r.Get("/interests", h.GetInterests)
	r.Put("/interests", h.UpdateInterests)
	r.Post("/interests/engage", h.Engage)

	// Extraction routes
	r.Post("/extract", h.ExtractTopics)
	r.Get("/posts/{postID}/topics", h.GetPostTopics)

	// Graph route
	r.Get("/graph", h.GetGraph)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("starting resonance_service", "port", cfg.Port)
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
