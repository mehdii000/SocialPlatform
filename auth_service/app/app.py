import os
import requests
from datetime import timedelta
from flask import Flask, request, jsonify
from flask_limiter import Limiter
from flask_bcrypt import Bcrypt
from flask_limiter.util import get_remote_address
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity

from database_utils import (
    is_username_taken, 
    is_email_taken,
    does_password_match,
    db_create_signup, 
    db_get_signups, 
    db_init
)

app = Flask(__name__)
bcrypt = Bcrypt(app)

app.config["JWT_SECRET_KEY"] = "b2eea992-b48b-4013-b39b-dae141ba63f3"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=60)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

jwt = JWTManager(app)

# Initialize the rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    storage_uri="memory://",
)

@app.route('/signup', methods=['POST'])
@limiter.limit("10 per hour")
def signup():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    # Validation: Ensure all fields are provided
    if not all([username, email, password]):
        return jsonify({"error": "Missing username, email, or password"}), 400
    
    # Validation: Check if user already exists
    try:
        if is_username_taken(username):
            return jsonify({"error": "Username already taken"}), 400
        
        if is_email_taken(email):
            return jsonify({"error": "Email already taken"}), 400

        # Send request /createuser to users-service (pretty self explanatory i think)
        # Note that if /createuser fails this should early exist to not alter auth_db
        users_service_url = 'http://users-service:5000/createuser'
        response = requests.post(users_service_url, json={
                "username": username, 
                "email": email
        })

        if (response.status_code != 201):
            return jsonify({
                "error": "Failed to create user in users-service",
                "details": response.json()
            }), 500

        # Securely hash the password before storing
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Save to auth_db
        db_create_signup(username, email, hashed_password)

        print(f"Created user: {username}, {email}")
        return jsonify({
            "message": "User created successfully"
        }), 201

    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500

@app.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    
    email = data.get('email')
    password = data.get('password')
    if not all([email, password]):
        return jsonify({"error": "Missing email or password"}), 400    

    # Validation: Check if email exists then check hashed password.
    try:
        if not is_email_taken(email):
            return jsonify({"error": "Email not registered"}), 401

        if not does_password_match(email, password, bcrypt):
            return jsonify({"error": "Invalid credentials"}), 401

        # Everything after this: Login matches
        jwt_token = create_access_token(identity=email)
        refresh_token = create_refresh_token(identity=email)

        return jsonify(jwt_token=jwt_token, refresh_token=refresh_token), 200
        
    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500

@app.route('/refresh', methods=["POST"])
@jwt_required(refresh=True) # This decorator specifically requires a REFRESH token
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify(access_token=access_token)

@app.route('/validate', methods=['POST'])
@jwt_required()
def validate():
    if request.is_json:
        identity = get_jwt_identity()
        return jsonify(logged_in_as=identity), 200
    else:
        return jsonify({"error": "Request must be JSON"}), 400

@app.route('/getusers', methods=['GET'])
def get_users():
    try:
        users = db_get_signups()
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": "Could not retrieve users", "details": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    users_service_url = 'http://users-service:5000/health'
    
    try:
        # We use a short timeout so the app doesn't hang if the other service is down
        response = requests.get(users_service_url, timeout=3)
        
        if response.status_code == 200:
            return "<h1>AUTH SERVICE is healthy & USERS SERVICE is healthy!</h1>", 200
        else:
            return "<h1>AUTH SERVICE is healthy but USERS SERVICE is unstable!</h1>", 503
            
    except requests.exceptions.RequestException as e:
        return (
            f"<h1>AUTH SERVICE is healthy but USERS SERVICE is unreachable!</h1>"
            f"<p>Error: {str(e)}</p>"
        ), 503

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "error": "ratelimit exceeded.", 
        "message": str(e.description)
    }), 429

if __name__ == '__main__':
    db_init()
    app.run(debug=True, host='0.0.0.0', port=5000)
