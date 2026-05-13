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

	if _, err := conn.Exec(ctx, createPostsTable); err != nil {
		return fmt.Errorf("create posts table: %w", err)
	}
	if _, err := conn.Exec(ctx, createLikesTable); err != nil {
		return fmt.Errorf("create likes table: %w", err)
	}
	if _, err := conn.Exec(ctx, createCommentsTable); err != nil {
		return fmt.Errorf("create comments table: %w", err)
	}
	return nil
}

const createPostsTable = `
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type SMALLINT NOT NULL DEFAULT 0 CHECK (media_type IN (0, 1, 2)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type SMALLINT NOT NULL DEFAULT 0;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='image_url') THEN
        ALTER TABLE posts RENAME COLUMN image_url TO media_url;
    END IF;
END $$;`

const createLikesTable = `
CREATE TABLE IF NOT EXISTS likes (
    user_id UUID NOT NULL,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);`

const createCommentsTable = `
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at);`
