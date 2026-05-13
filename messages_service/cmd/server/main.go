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
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mehdii000/SocialPlatform/messages_service/internal/config"
	"github.com/mehdii000/SocialPlatform/messages_service/internal/handler"
	"github.com/mehdii000/SocialPlatform/messages_service/internal/middleware"
	"github.com/mehdii000/SocialPlatform/messages_service/internal/repository"
	"github.com/mehdii000/SocialPlatform/messages_service/internal/service"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

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

	msgRepo := repository.NewMessageRepo(pool)
	hub := service.NewHub()
	go hub.Run(logger)

	msgHandler := service.NewMessageHandler(msgRepo, hub)
	messagesHandler := handler.NewMessagesHandler(msgRepo, logger)

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))

	r.Get("/health", messagesHandler.Health)
	r.Get("/ready", messagesHandler.Ready)
	r.Get("/getconvo", messagesHandler.GetConversations)
	r.Get("/history", messagesHandler.GetHistory)
	r.Post("/conversations", messagesHandler.CreateConversation)

	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		tokenStr := r.URL.Query().Get("token")
		if tokenStr == "" {
			http.Error(w, `{"error":"missing token"}`, http.StatusUnauthorized)
			return
		}

		userID, err := validateJWT(tokenStr, []byte(cfg.JWTSecret))
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}
		username, err := msgRepo.GetUsernameByID(r.Context(), userID)
		if err != nil {
			http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
			logger.Error("failed to lookup username", "error", err)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			logger.Error("websocket upgrade failed", "error", err)
			return
		}

		client := &service.Client{
			UserID: userID,
			Username: username,
			Conn:   conn,
			Send:   make(chan []byte, 256),
			Hub:    hub,
		}

		hub.Register <- client

		go client.WritePump(logger)
		go client.ReadPump(msgHandler, logger)
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info("starting messages_service", "port", cfg.Port)
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

func validateJWT(tokenStr string, secret []byte) (uuid.UUID, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return secret, nil
	})
	if err != nil || !token.Valid {
		return uuid.Nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, jwt.ErrSignatureInvalid
	}

	sub, err := claims.GetSubject()
	if err != nil {
		return uuid.Nil, err
	}

	return uuid.Parse(sub)
}
