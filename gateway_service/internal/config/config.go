package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port       string
	JWTSecret  string
	AuthURL    string
	UsersURL   string
	PostsURL   string
	MessagesURL string
	MinioURL   string
	FrontendURL string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:        envOrDefault("GATEWAY_PORT", "8000"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		AuthURL:     envOrDefault("AUTH_SERVICE_URL", "http://auth-service:8001"),
		UsersURL:    envOrDefault("USERS_SERVICE_URL", "http://users-service:8002"),
		PostsURL:    envOrDefault("POSTS_SERVICE_URL", "http://posts-service:8003"),
		MessagesURL: envOrDefault("MESSAGES_SERVICE_URL", "http://messages-service:8004"),
		MinioURL:    envOrDefault("MINIO_URL", "http://minio:9000"),
		FrontendURL: envOrDefault("FRONTEND_URL", "http://frontend:3000"),
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
