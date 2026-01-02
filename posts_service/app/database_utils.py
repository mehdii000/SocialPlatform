import psycopg2

def get_db_connection():
    return psycopg2.connect(
        host='db',
        database='social_db',
        user='user',
        password='mehdi'
    )

def db_init():
    connection = get_db_connection()
    try:
        with connection:
            with connection.cursor() as cursor:

                # 1. Flavors table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS flavors (
                        id SERIAL PRIMARY KEY,

                        name VARCHAR(50) UNIQUE NOT NULL,
                        slug VARCHAR(50) UNIQUE NOT NULL,

                        description TEXT,
                        created_at TIMESTAMP WITH TIME ZONE
                            DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # 2. Ensure "General" flavor exists with id = 1
                cursor.execute("""
                    INSERT INTO flavors (id, name, slug, description)
                    VALUES (1, 'General', 'general', 'Default flavor for all sort of posts.')
                    ON CONFLICT (id) DO NOTHING;
                """)

                # 3. Posts table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS posts (
                        id BIGSERIAL PRIMARY KEY,

                        user_id BIGINT NOT NULL,
                        flavor_id INTEGER REFERENCES flavors(id) DEFAULT 1,

                        content TEXT NOT NULL,
                        image_url TEXT,

                        likes_count INTEGER DEFAULT 0,
                        comments_count INTEGER DEFAULT 0,

                        created_at TIMESTAMP WITH TIME ZONE
                            DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE
                            DEFAULT CURRENT_TIMESTAMP,

                        is_deleted BOOLEAN DEFAULT FALSE
                    );
                """)

                # 4. Feed indexes
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

                # Create likes table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS likes (
                        id BIGSERIAL PRIMARY KEY,

                        post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
                        user_id BIGINT NOT NULL,

                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                        UNIQUE (post_id, user_id)
                    );
                """)

                # Create comments table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS comments (
                        id BIGSERIAL PRIMARY KEY,

                        post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
                        user_id BIGINT NOT NULL,

                        content TEXT NOT NULL,

                        created_at TIMESTAMP WITH TIME ZONE
                            DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE
                            DEFAULT CURRENT_TIMESTAMP,

                        is_deleted BOOLEAN DEFAULT FALSE
                    );
                """)

        connection.commit()

    finally:
        connection.close()
