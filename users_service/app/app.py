import os
import psycopg2
from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt
from minio_utils import upload_media
from routes.profiles import profile_bp

from database_utils import (
    db_init,
    db_create_default_user,
    db_change_profile_picture,
    db_get_users
)

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
jwt = JWTManager(app)

app.register_blueprint(profile_bp, url_prefix='/public/profiles')

@app.route('/internal/createuser', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    username = data.get('username')
    email = data.get('email')
    if not all([username, email]):
        return jsonify({"error": "Missing username or email"}), 400

    try:
        db_create_default_user(username, email)
        print(f"Created default user: {username}")
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        return jsonify({"error": "Could not create user", "details": str(e)}), 500

@app.route('/public/getusers', methods=['GET'])
def get_users():
    try:
        users = db_get_users()
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": "Could not retrieve users", "details": str(e)}), 500
    
@app.route('/public/search', methods=['GET'])
def search_users():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Missing search query parameter 'q'"}), 400
    try:
        users = db_get_users()
        # Filter
        filtered_users = [user for user in users if query.lower() in user['username'].lower()]
        return jsonify({"results": filtered_users}), 200
    except Exception as e:
        return jsonify({"error": "Could not search users", "details": str(e)}), 500

        

###################################################
@app.route('/public/changeprofilepic', methods=['POST'])
@jwt_required()
def create_post():
    # 1. Extract Data
    image_file = request.files.get('image')

    # 2. Validation
    if not image_file:
        return jsonify({"error": "Profile image cannot be empty"}), 400
    
    # 3. Auth Data
    claims = get_jwt()
    user_id = claims.get('id')

    # 4. Media Processing
    media_url = None

    try:
        media_url = upload_media(image_file)
    except Exception as e:
        app.logger.error(f"Media Upload Fail: {str(e)}")
        return jsonify({"error": "File upload failed"}), 500
    
    db_change_profile_picture(user_id, media_url)
    return jsonify({"message": "Profile picture updated", "profile_picture_url": media_url}), 200


@app.route('/public/health', methods=['GET'])
def health():
    return "<h1>SERVICE USERS is healthy!</h1>", 200

if __name__ == '__main__':
    try:
        db_init()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
        exit(1)

    # Ensure MinIO bucket is public
    from minio_utils import ensure_bucket_public, BUCKET_NAME
    try:
        ensure_bucket_public(BUCKET_NAME)
        print(f"MinIO bucket '{BUCKET_NAME}' ensured to be public.")
    except Exception as e:
        print(f"Error ensuring MinIO bucket public: {e}")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
