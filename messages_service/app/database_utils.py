import psycopg2
import os

def get_db_connection():
    return psycopg2.connect(
        host= os.environ.get("DB_HOST"),
        database='social_db',
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
    )

def db_init():
    connection = get_db_connection()
    try:
        with connection:
            with connection.cursor() as cursor:

                # 1. Conversation "Room"
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # 2. Participants Link (Connects Users to Conversations)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS conversation_participants (
                        conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
                        user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (conversation_id, user_id)
                    );
                """)

                # 3. Messages Table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS messages (
                        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                        conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
                        sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                        content TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # Performance Indexes
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);")

    finally:
        connection.close()
