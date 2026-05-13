package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
}

func Load() (*Config, error) {
	required := map[string]string{
		"RESONANCE_DB_URL": os.Getenv("RESONANCE_DB_URL"),
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
		Port:        envOrDefault("RESONANCE_SERVICE_PORT", "8005"),
		DatabaseURL: required["RESONANCE_DB_URL"],
	}, nil
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
