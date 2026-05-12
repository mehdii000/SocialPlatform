package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("acquire conn for migrations: %w", err)
	}
	defer conn.Release()

	migrations := []struct {
		name string
		sql  string
	}{
		{"000001_create_users_table", createUsersTable},
		{"000002_create_refresh_tokens_table", createRefreshTokensTable},
	}

	for _, m := range migrations {
		var exists bool
		err := conn.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
			func() string {
				if m.name == "000001_create_users_table" {
					return "users"
				}
				return "refresh_tokens"
			}(),
		).Scan(&exists)
		if err != nil {
			return fmt.Errorf("check table existence %s: %w", m.name, err)
		}
		if !exists {
			if _, err := conn.Exec(ctx, m.sql); err != nil {
				return fmt.Errorf("run migration %s: %w", m.name, err)
			}
		}
	}
	return nil
}

const createUsersTable = `
CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`

const createRefreshTokensTable = `
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`
