import os
import psycopg2
from psycopg2 import pool
from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt
from datetime import datetime

# Import local utilities
from database_utils import db_init
from minio_utils import upload_media

app = Flask(__name__)

# --- Configuration ---
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit
jwt = JWTManager(app)

# --- Database Connection Pool ---
# We initialize the pool globally to reuse connections across requests
try:
    db_pool = pool.SimpleConnectionPool(
        1, 20,
        host=os.environ.get("DB_HOST"),
        database="social_db",
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD")
    )
    print("Database connection pool created successfully")
except Exception as e:
    print(f"Error creating database connection pool: {e}")

# --- Helper: Get DB Connection ---
def get_db_connection():
    return db_pool.getconn()

def release_db_connection(conn):
    db_pool.putconn(conn)

# --- Routes ---

@app.route('/public/health', methods=['GET'])
def health():
    return jsonify({"service": "posts-service", "status": "healthy"}), 200

@app.route('/public/createpost', methods=['POST'])
@jwt_required()
def create_post():
    # 1. Extract Data
    text_content = request.form.get('text', '').strip()
    image_file = request.files.get('image')
    video_file = request.files.get('video')

    # 2. Validation
    if not any([text_content, image_file, video_file]):
        return jsonify({"error": "Post cannot be empty"}), 400
    
    if image_file and video_file:
        return jsonify({"error": "Post can only contain one image OR one video"}), 400

    # 3. Auth Data
    claims = get_jwt()
    user_id = claims.get('id')

    # 4. Media Processing
    media_url = None
    media_type = 0 # 0: Text, 1: Image, 2: Video

    try:
        if image_file:
            media_url = upload_media(image_file)
            media_type = 1
        elif video_file:
            media_url = upload_media(video_file)
            media_type = 2
    except Exception as e:
        app.logger.error(f"Media Upload Fail: {str(e)}")
        return jsonify({"error": "File upload failed"}), 500

    # 5. Database Insertion
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO posts (user_id, content, media_url, media_type)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (user_id, text_content, media_url, media_type)
            )
            post_id = cur.fetchone()[0]
            conn.commit()
        return jsonify({"message": "Post created", "post_id": post_id}), 201
    except Exception as e:
        conn.rollback()
        app.logger.error(f"DB Error: {str(e)}")
        return jsonify({"error": "Database saving failed"}), 500
    finally:
        release_db_connection(conn)

@app.route('/public/getposts', methods=['GET'])
@jwt_required()
def get_posts():
    # Get the current user's ID from the JWT
    claims = get_jwt()
    current_user_id = claims.get('id')
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    p.id, 
                    p.user_id, 
                    u.username,
                    p.content, 
                    p.media_url, 
                    p.media_type, 
                    p.likes_count, 
                    p.comments_count, 
                    p.created_at,
                    -- Check if a like exists for the current user
                    EXISTS (
                        SELECT 1 FROM likes l 
                        WHERE l.post_id = p.id AND l.user_id = %s
                    ) as is_liked
                FROM posts p
                INNER JOIN users u ON p.user_id = u.id
                WHERE p.is_deleted = FALSE 
                ORDER BY p.created_at DESC;
            """, (current_user_id,)) # Pass the user_id to the query
            
            rows = cur.fetchall()
            
            posts_list = []
            for row in rows:
                posts_list.append({
                    "id": row[0],
                    "user_id": row[1],
                    "username": row[2],
                    "content": row[3],
                    # Fixed row index for media_url (row[4])
                    "media_url": f"{row[4]}" if row[4] else None,
                    "media_type": row[5],
                    "likes_count": row[6],
                    "comments_count": row[7],
                    "created_at": row[8].isoformat() if hasattr(row[8], 'isoformat') else row[8],
                    "is_liked": row[9] # This is now the boolean result from the EXISTS clause
                })
        return jsonify(posts_list), 200
    except Exception as e:
        app.logger.error(f"Fetch Error: {str(e)}")
        return jsonify({"error": "Could not retrieve posts"}), 500
    finally:
        release_db_connection(conn)

@app.route('/public/like', methods=['POST'])
@jwt_required()
def like_post():
    user_id = get_jwt().get('id')
    print(user_id)
    post_id = request.json.get('post_id')

    if not post_id:
        return jsonify({"error": "Post ID is required"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if the user has already liked the post
            cur.execute("""
                SELECT id FROM likes WHERE user_id = %s AND post_id = %s;
            """, (user_id, post_id))
            existing_like = cur.fetchone()

            if existing_like:
                # User already liked, so unlike the post
                cur.execute("""
                    DELETE FROM likes WHERE user_id = %s AND post_id = %s;
                """, (user_id, post_id))
                cur.execute("""
                    UPDATE posts SET likes_count = likes_count - 1 WHERE id = %s AND likes_count > 0;
                """, (post_id,))
                conn.commit()
                return jsonify({"message": "Post unliked successfully"}), 200
            else:
                # User has not liked, so like the post
                cur.execute("""
                    INSERT INTO likes (user_id, post_id) VALUES (%s, %s);
                """, (user_id, post_id))
                cur.execute("""
                    UPDATE posts SET likes_count = likes_count + 1 WHERE id = %s;
                """, (post_id,))
                conn.commit()
                return jsonify({"message": "Post liked successfully"}), 201
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Like/Unlike Error: {str(e)}")
        return jsonify({"error": "Failed to process like/unlike"}), 500
    finally:
        release_db_connection(conn)

@app.route('/public/get/<int:post_id>', methods=['GET']) # Changed to GET and added post_id
@jwt_required()
def get_single_post(post_id):
    # Get the current user's ID from the JWT to check "is_liked" status
    claims = get_jwt()
    current_user_id = claims.get('id')
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Using parameterized queries (%s) to prevent SQL Injection
            cur.execute("""
                SELECT 
                    p.id, 
                    p.user_id, 
                    u.username,
                    p.content, 
                    p.media_url, 
                    p.media_type, 
                    p.likes_count, 
                    p.comments_count, 
                    p.created_at,
                    EXISTS (
                        SELECT 1 FROM likes l 
                        WHERE l.post_id = p.id AND l.user_id = %s
                    ) as is_liked
                FROM posts p
                INNER JOIN users u ON p.user_id = u.id
                WHERE p.id = %s AND p.is_deleted = FALSE;
            """, (current_user_id, post_id)) # Order matters: current_user_id for EXISTS, post_id for WHERE
            
            row = cur.fetchone()
            
            if not row:
                return jsonify({"error": "Post not found"}), 404

            post_data = {
                "id": row[0],
                "user_id": row[1],
                "username": row[2],
                "content": row[3],
                "media_url": f"{row[4]}" if row[4] else None,
                "media_type": row[5],
                "likes_count": row[6],
                "comments_count": row[7],
                "created_at": row[8].isoformat() if hasattr(row[8], 'isoformat') else row[8],
                "is_liked": row[9]
            }
            
        return jsonify(post_data), 200
    except Exception as e:
        app.logger.error(f"Fetch Error: {str(e)}")
        return jsonify({"error": "Could not retrieve post"}), 500
    finally:
        release_db_connection(conn)

@app.route('/public/delete', methods=['POST'])
@jwt_required()
def deletePost():
    user_id = get_jwt().get('id')
    post_id = request.json.get('post_id')

    # check if doesnt exist or its not a number
    if not post_id or not isinstance(post_id, int):
        return jsonify({"error": "Post ID is required"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First, check if the post exists and belongs to the user
            cur.execute("""
                SELECT id FROM posts WHERE id = %s AND user_id = %s AND is_deleted = FALSE;
            """, (post_id, user_id))
            post_to_delete = cur.fetchone()

            if not post_to_delete:
                return jsonify({"error": "Post not found or you don't have permission to delete it"}), 403

            # Mark the post as deleted
            cur.execute("""
                UPDATE posts SET is_deleted = TRUE WHERE id = %s;
            """, (post_id,))
            conn.commit()
        return jsonify({"message": "Post deleted successfully"}), 200
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Delete Post Error: {str(e)}")
        return jsonify({"error": "Failed to delete post"}), 500
    finally:
        release_db_connection(conn)
        
@app.route('/public/getposts/<int:user_id>', methods=['GET'])
@jwt_required(optional=True)
def get_posts_by_user(user_id):
    # If no token is provided, get_jwt() returns an empty dict
    claims = get_jwt()
    
    # Use .get() with a default value of -1 if 'id' is missing or claims is empty
    current_user_id = claims.get('id', -1)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    p.id, 
                    p.user_id, 
                    u.username,
                    p.content, 
                    p.media_url, 
                    p.media_type, 
                    p.likes_count, 
                    p.comments_count, 
                    p.created_at,
                    -- If current_user_id is -1, is_liked will naturally be False
                    EXISTS (
                        SELECT 1 FROM likes l 
                        WHERE l.post_id = p.id AND l.user_id = %s
                    ) as is_liked
                FROM posts p
                INNER JOIN users u ON p.user_id = u.id
                WHERE p.is_deleted = FALSE
                AND p.user_id = %s
                ORDER BY p.created_at DESC;
            """, (current_user_id, user_id,))
            
            rows = cur.fetchall()
            
            posts_list = []
            for row in rows:
                posts_list.append({
                    "id": row[0],
                    "user_id": row[1],
                    "username": row[2],
                    "content": row[3],
                    "media_url": f"{row[4]}" if row[4] else None,
                    "media_type": row[5],
                    "likes_count": row[6],
                    "comments_count": row[7],
                    "created_at": row[8].isoformat() if hasattr(row[8], 'isoformat') else row[8],
                    "is_liked": row[9]
                })
        return jsonify(posts_list), 200
    except Exception as e:
        app.logger.error(f"Fetch Error: {str(e)}")
        return jsonify({"error": "Could not retrieve posts"}), 500
    finally:
        release_db_connection(conn)

# --- Entry Point ---
if __name__ == '__main__':
    # Initialize the tables using a single connection from the pool
    conn = None
    try:
        conn = db_pool.getconn()
        db_init(conn) # Pass the connection here
        db_pool.putconn(conn)
    except Exception as e:
        if conn:
            db_pool.putconn(conn)
        print("Could not initialize DB, exiting...")
        exit(1)

    # Ensure MinIO bucket is public
    from minio_utils import ensure_bucket_public, BUCKET_NAME
    try:
        ensure_bucket_public(BUCKET_NAME)
        print(f"MinIO bucket '{BUCKET_NAME}' ensured to be public.")
    except Exception as e:
        print(f"Error ensuring MinIO bucket public: {e}")

    app.run(debug=True, host='0.0.0.0', port=5000)
