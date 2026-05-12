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
	"golang.org/x/time/rate"

	"github.com/mehdii000/SocialPlatform/gateway_service/internal/config"
	"github.com/mehdii000/SocialPlatform/gateway_service/internal/handler"
	"github.com/mehdii000/SocialPlatform/gateway_service/internal/middleware"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	jwtAuth := middleware.NewJWTAuth(cfg.JWTSecret, logger)
	rateLimiter := middleware.NewIPRateLimiter(rate.Limit(100), 200)
	proxyHandler := handler.NewProxyHandler(handler.ProxyConfig{
		AuthURL:     cfg.AuthURL,
		UsersURL:    cfg.UsersURL,
		PostsURL:    cfg.PostsURL,
		MessagesURL: cfg.MessagesURL,
		MinioURL:    cfg.MinioURL,
		FrontendURL: cfg.FrontendURL,
	}, logger)

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.RateLimit(rateLimiter))
	r.Use(jwtAuth.Middleware)

	r.Handle("/*", proxyHandler)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info("starting gateway", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)

	logger.Info("server stopped")
}
