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
                # Enable citext extension (safe & idempotent)
                cursor.execute("""
                    CREATE EXTENSION IF NOT EXISTS citext;
                """)

                # Create users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

                        username VARCHAR(30) UNIQUE NOT NULL,
                        email CITEXT UNIQUE NOT NULL,

                        bio TEXT DEFAULT 'Placeholder bio, probably change me later.',
                        profile_picture_url TEXT,
                        account_status VARCHAR(20) DEFAULT 'new',

                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """)

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

def db_get_public_user_by_username(username):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, username, bio, profile_picture_url FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
        
        if user:
            return {
                "id": user[0],
                "username": user[1],
                "bio": user[2],
                "profile_picture_url": user[3]
            }
        return None
    finally:
        connection.close()

def db_update_user_bio(email, bio):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("UPDATE users SET bio = %s WHERE email = %s", (bio, email))
        connection.commit()
    finally:
        connection.close()

def db_change_profile_picture(user_id, profile_picture_url):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("UPDATE users SET profile_picture_url = %s WHERE id = %s", (
                f"{profile_picture_url}"
                , user_id
                ))
        connection.commit()
    finally:
        connection.close()
