import os
import psycopg2
from flask import Flask, request, jsonify

from database_utils import (
    db_init,
    db_create_default_user,
    db_get_users
)

app = Flask(__name__)

@app.route('/createuser', methods=['POST'])
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

@app.route('/getusers', methods=['GET'])
def get_users():
    try:
        users = db_get_users()
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": "Could not retrieve users", "details": str(e)}), 500
        
    

@app.route('/health')
def health():
    return "<h1>SERVICE USERS is healthy!</h1>", 200

if __name__ == '__main__':
    db_init()
    app.run(debug=True, host='0.0.0.0', port=5000)
