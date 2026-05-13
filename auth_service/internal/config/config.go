package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	UsersServiceURL string
}

func Load() (*Config, error) {
	required := map[string]string{
		"AUTH_DB_URL":    "",
		"JWT_SECRET":     "",
		"AUTH_SERVICE_PORT": "",
	}

	missing := []string{}
	for k := range required {
		v := os.Getenv(k)
		if v == "" {
			missing = append(missing, k)
		}
		required[k] = v
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required env vars: %v", missing)
	}

	port := required["AUTH_SERVICE_PORT"]
	if port == "" {
		port = "8001"
	}

	return &Config{
		Port:            port,
		DatabaseURL:     required["AUTH_DB_URL"],
		JWTSecret:       required["JWT_SECRET"],
		UsersServiceURL: os.Getenv("USERS_SERVICE_URL"),
	}, nil
}
