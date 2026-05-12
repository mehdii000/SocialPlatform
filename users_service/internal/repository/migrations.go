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

	if _, err := conn.Exec(ctx, createProfilesTable); err != nil {
		return fmt.Errorf("create profiles table: %w", err)
	}
	if _, err := conn.Exec(ctx, createFollowsTable); err != nil {
		return fmt.Errorf("create follows table: %w", err)
	}
	return nil
}

const createProfilesTable = `
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    bio TEXT DEFAULT '',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`

const createFollowsTable = `
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL,
    followee_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);`
