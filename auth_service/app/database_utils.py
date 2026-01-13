import psycopg2
import os

def get_db_connection():
    return psycopg2.connect(
        host= os.environ.get("DB_HOST"),
        database='auth_db',
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
    )

def db_init():
    connection = get_db_connection()
    try:
        with connection:
            with connection.cursor() as cursor:
                # Enable citext (safe to call multiple times)
                cursor.execute("""
                    CREATE EXTENSION IF NOT EXISTS citext;
                """)

                # Create signup table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS signup (
                        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

                        username VARCHAR(30) UNIQUE NOT NULL,
                        email CITEXT UNIQUE NOT NULL,

                        hashed_password VARCHAR(255) NOT NULL
                    );
                """)
    finally:
        connection.close()


def is_username_taken(name):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM signup WHERE username = %s", (name,))
            count = cursor.fetchone()[0]
        return int(count) > 0
    finally:
        connection.close()
    
def is_email_taken(email):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM signup WHERE email = %s", (email,))
            count = cursor.fetchone()[0]
        return int(count) > 0
    finally:
        connection.close()

def does_password_match(email, password, bcrypt):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT hashed_password FROM signup WHERE email = %s", (email,))
            result = cursor.fetchone()
            if result is None:
                return False
            stored_hashed_password = result[0]
        return bcrypt.check_password_hash(stored_hashed_password, password)
    finally:
        connection.close()

def db_create_signup(username, email, hashed_password):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO signup (username, email, hashed_password) VALUES (%s, %s, %s)",
                (username, email, hashed_password)
            )
        connection.commit()
    finally:
        connection.close()

def db_get_id_from_email(email):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM signup WHERE email = %s", (email,))
            result = cursor.fetchone()
            if result:
                return result[0]
            return None
    finally:
        connection.close()

def db_get_signups():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, username, email, hashed_password FROM signup")
            users = cursor.fetchall()
        
        user_list = []
        for user in users:
            user_list.append({
                "id": user[0],
                "username": user[1],
                "email": user[2]
                #"hashed_password": user[3]
            })
        return user_list
    finally:
        connection.close()
