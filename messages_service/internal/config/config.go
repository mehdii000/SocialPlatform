package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

func Load() (*Config, error) {
	required := map[string]string{
		"MESSAGES_DB_URL": os.Getenv("MESSAGES_DB_URL"),
		"JWT_SECRET":      os.Getenv("JWT_SECRET"),
	}

	missing := []string{}
	for k, v := range required {
		if v == "" {
			missing = append(missing, k)
		}
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required env vars: %v", missing)
	}

	return &Config{
		Port:        envOrDefault("MESSAGES_SERVICE_PORT", "8004"),
		DatabaseURL: required["MESSAGES_DB_URL"],
		JWTSecret:   required["JWT_SECRET"],
	}, nil
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
