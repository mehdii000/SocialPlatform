package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port         string
	DatabaseURL  string
	MinioEndpoint string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket   string
}

func Load() (*Config, error) {
	required := map[string]string{
		"USERS_DB_URL":    os.Getenv("USERS_DB_URL"),
		"MINIO_ENDPOINT":  os.Getenv("MINIO_ENDPOINT"),
		"MINIO_ACCESS_KEY": os.Getenv("MINIO_ACCESS_KEY"),
		"MINIO_SECRET_KEY": os.Getenv("MINIO_SECRET_KEY"),
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
		Port:           envOrDefault("USERS_SERVICE_PORT", "8002"),
		DatabaseURL:    required["USERS_DB_URL"],
		MinioEndpoint:  required["MINIO_ENDPOINT"],
		MinioAccessKey: required["MINIO_ACCESS_KEY"],
		MinioSecretKey: required["MINIO_SECRET_KEY"],
		MinioBucket:    envOrDefault("MINIO_BUCKET_AVATARS", "avatars"),
	}, nil
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
