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

	if _, err := conn.Exec(ctx, `CREATE EXTENSION IF NOT EXISTS pg_trgm`); err != nil {
		return fmt.Errorf("enable pg_trgm: %w", err)
	}

	if _, err := conn.Exec(ctx, createTopicsTable); err != nil {
		return fmt.Errorf("create topics table: %w", err)
	}
	if _, err := conn.Exec(ctx, createPostTopicsTable); err != nil {
		return fmt.Errorf("create post_topics table: %w", err)
	}
	if _, err := conn.Exec(ctx, createUserInterestsTable); err != nil {
		return fmt.Errorf("create user_interests table: %w", err)
	}

	seedCount := 0
	if err := conn.QueryRow(ctx, `SELECT COUNT(*) FROM topics`).Scan(&seedCount); err != nil {
		return fmt.Errorf("count topics: %w", err)
	}
	if seedCount == 0 {
		if _, err := conn.Exec(ctx, seedTopics); err != nil {
			return fmt.Errorf("seed topics: %w", err)
		}
	}

	return nil
}

const createTopicsTable = `
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    parent_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    post_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_id);`

const createPostTopicsTable = `
CREATE TABLE IF NOT EXISTS post_topics (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    relevance REAL NOT NULL DEFAULT 1.0,
    is_auto BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (post_id, topic_id)
);
CREATE INDEX IF NOT EXISTS idx_post_topics_topic ON post_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_post_topics_post ON post_topics(post_id);`

const createUserInterestsTable = `
CREATE TABLE IF NOT EXISTS user_interests (
    user_id UUID NOT NULL,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    weight REAL NOT NULL DEFAULT 0.5,
    last_engaged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, topic_id)
);
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);`

const seedTopics = `
INSERT INTO topics (name, slug, description) VALUES
    ('Technology', 'technology', 'Everything tech: gadgets, software, hardware, and innovation'),
    ('Programming', 'programming', 'Code, development, software engineering, and developer life'),
    ('Web Dev', 'webdev', 'Web development, frontend, backend, and full-stack'),
    ('Mobile', 'mobile', 'Mobile apps, smartphones, and mobile development'),
    ('AI & ML', 'ai', 'Artificial intelligence, machine learning, and neural networks'),
    ('Gaming', 'gaming', 'Video games, esports, and gaming culture'),
    ('Design', 'design', 'UI/UX, graphic design, and visual design'),
    ('UX', 'ux', 'User experience, interaction design, and usability'),
    ('Art', 'art', 'Visual arts, painting, illustration, and creativity'),
    ('Photography', 'photography', 'Photography, cameras, and visual storytelling'),
    ('Filmmaking', 'filmmaking', 'Film, video production, and cinema'),
    ('Music', 'music', 'Music production, instruments, artists, and listening'),
    ('Science', 'science', 'Science news, discoveries, and research'),
    ('Space', 'space', 'Space exploration, astronomy, and the cosmos'),
    ('Nature', 'nature', 'Nature, environment, wildlife, and sustainability'),
    ('Animals', 'animals', 'Animals, pets, wildlife, and conservation'),
    ('Food', 'food', 'Food, cooking, recipes, and culinary arts'),
    ('Travel', 'travel', 'Travel, destinations, culture, and adventure'),
    ('Fashion', 'fashion', 'Fashion, style, clothing, and trends'),
    ('Fitness', 'fitness', 'Fitness, workouts, health, and exercise'),
    ('Sports', 'sports', 'Sports news, events, and athletics'),
    ('Basketball', 'basketball', 'Basketball, NBA, and hoops'),
    ('Football', 'football', 'Football, soccer, and the beautiful game'),
    ('Books', 'books', 'Books, literature, reading, and writing'),
    ('Writing', 'writing', 'Writing, creative writing, and storytelling'),
    ('Poetry', 'poetry', 'Poetry, poets, and poetic expression'),
    ('Philosophy', 'philosophy', 'Philosophy, thought, and ideas'),
    ('Humor', 'humor', 'Humor, comedy, memes, and jokes'),
    ('Memes', 'memes', 'Internet memes, viral content, and fun'),
    ('Business', 'business', 'Business, entrepreneurship, and startups'),
    ('Startup', 'startup', 'Startups, venture capital, and building companies'),
    ('General', 'general', 'General discussion and miscellaneous topics')
ON CONFLICT (slug) DO NOTHING;`
