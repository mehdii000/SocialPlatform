import psycopg2

def get_db_connection():
    return psycopg2.connect(
        host='db',
        database='users_db',
        user='user',
        password='mehdi'
    )

def db_init():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                    
                    username VARCHAR(30) UNIQUE NOT NULL,
                    email VARCHAR(70) UNIQUE NOT NULL,
                    
                    bio TEXT DEFAULT 'Placeholde bio, probably change me later.',
                    profile_picture_url TEXT,
                    account_status VARCHAR(20) DEFAULT 'new',
                    
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
        connection.commit() # Save changes
    finally:
        connection.close()


def db_create_default_user(username, email):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO users (username, email) VALUES (%s, %s)",(username, email))
        connection.commit()
    finally:
        connection.close()

def db_get_users():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, username, email, bio, profile_picture_url, account_status, created_at FROM users")
            users = cursor.fetchall()
        
        user_list = []
        for user in users:
            user_list.append({
                "id": user[0],
                "username": user[1],
                "email": user[2],
                "bio": user[3],
                "profile_picture_url": user[4],
                "account_status": user[5],
                "created_at": user[6]
            })
        return user_list
    finally:
        connection.close()

def db_get_user_by_email(email):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, username, email, bio, profile_picture_url, account_status, created_at FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
        
        if user:
            return {
                "id": user[0],
                "username": user[1],
                "email": user[2],
                "bio": user[3],
                "profile_picture_url": user[4],
                "account_status": user[5],
                "created_at": user[6]
            }
        return None
    finally:
        connection.close()
