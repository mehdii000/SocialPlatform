import psycopg2

def db_init(connection):
    try:
        with connection:
            with connection.cursor() as cursor:

                # -------------------------------------------------
                # 1. Flavors table
                # -------------------------------------------------
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS flavors (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(50) UNIQUE NOT NULL,
                        slug VARCHAR(50) UNIQUE NOT NULL,
                        description TEXT,
                        created_at TIMESTAMPTZ NOT NULL
                            DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # Ensure "General" flavor exists with id = 1
                cursor.execute("""
                    INSERT INTO flavors (id, name, slug, description)
                    VALUES (1, 'General', 'general', 'Default flavor for all sorts of posts.')
                    ON CONFLICT (id) DO NOTHING;
                """)

                # -------------------------------------------------
                # 2. Posts table
                # media_type:
                # 0 = none, 1 = image, 2 = video
                # -------------------------------------------------
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS posts (
                        id BIGSERIAL PRIMARY KEY,

                        user_id BIGINT NOT NULL
                            REFERENCES users(id) ON DELETE CASCADE,

                        flavor_id INTEGER NOT NULL DEFAULT 1
                            REFERENCES flavors(id) ON DELETE SET DEFAULT,

                        content TEXT NOT NULL,

                        media_url TEXT,
                        media_type SMALLINT NOT NULL DEFAULT 0
                            CHECK (media_type IN (0, 1, 2)),

                        likes_count INTEGER NOT NULL DEFAULT 0
                            CHECK (likes_count >= 0),

                        comments_count INTEGER NOT NULL DEFAULT 0
                            CHECK (comments_count >= 0),

                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

                        CHECK (
                            (media_type = 0 AND media_url IS NULL)
                         OR (media_type IN (1, 2) AND media_url IS NOT NULL)
                        )
                    );
                """)

                # -------------------------------------------------
                # 3. Indexes (feed + performance)
                # -------------------------------------------------
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_posts_user_id
                    ON posts(user_id);
                """)

                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_posts_flavor_id
                    ON posts(flavor_id);
                """)

                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_posts_created_at
                    ON posts(created_at DESC);
                """)

                # Partial index for feed queries (🔥 important)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_posts_feed
                    ON posts(created_at DESC)
                    WHERE is_deleted = FALSE;
                """)

                # -------------------------------------------------
                # 4. Likes table
                # -------------------------------------------------
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS likes (
                        id BIGSERIAL PRIMARY KEY,

                        post_id BIGINT NOT NULL
                            REFERENCES posts(id) ON DELETE CASCADE,

                        user_id BIGINT NOT NULL
                            REFERENCES users(id) ON DELETE CASCADE,

                        created_at TIMESTAMPTZ NOT NULL
                            DEFAULT CURRENT_TIMESTAMP,

                        UNIQUE (post_id, user_id)
                    );
                """)

                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_likes_post_id
                    ON likes(post_id);
                """)

                # -------------------------------------------------
                # 5. Comments table
                # -------------------------------------------------
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS comments (
                        id BIGSERIAL PRIMARY KEY,

                        post_id BIGINT NOT NULL
                            REFERENCES posts(id) ON DELETE CASCADE,

                        user_id BIGINT NOT NULL
                            REFERENCES users(id) ON DELETE CASCADE,

                        content TEXT NOT NULL,

                        created_at TIMESTAMPTZ NOT NULL
                            DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL
                            DEFAULT CURRENT_TIMESTAMP,

                        is_deleted BOOLEAN NOT NULL DEFAULT FALSE
                    );
                """)

                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_comments_post_id
                    ON comments(post_id);
                """)

                # -------------------------------------------------
                # 6. updated_at auto-update trigger
                # -------------------------------------------------
                cursor.execute("""
                    CREATE OR REPLACE FUNCTION set_updated_at()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.updated_at = CURRENT_TIMESTAMP;
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                """)

                cursor.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_trigger
                            WHERE tgname = 'trg_posts_updated_at'
                        ) THEN
                            CREATE TRIGGER trg_posts_updated_at
                            BEFORE UPDATE ON posts
                            FOR EACH ROW
                            EXECUTE FUNCTION set_updated_at();
                        END IF;
                    END;
                    $$;
                """)

                cursor.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_trigger
                            WHERE tgname = 'trg_comments_updated_at'
                        ) THEN
                            CREATE TRIGGER trg_comments_updated_at
                            BEFORE UPDATE ON comments
                            FOR EACH ROW
                            EXECUTE FUNCTION set_updated_at();
                        END IF;
                    END;
                    $$;
                """)

        connection.commit()

    finally:
        connection.close()


def get_username_from_id(connection, user_id):
    try:
        with connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT username FROM users WHERE id = %s;
                """, (user_id,))
                result = cursor.fetchone()
                if result:
                    return result[0]
                return None
    finally:
        connection.close()
    