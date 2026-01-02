import os
import psycopg2
from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager

from database_utils import (
    db_init
)

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = "b2eea992-b48b-4013-b39b-dae141ba63f3"
jwt = JWTManager(app)


@app.route('/public/health', methods=['GET'])
def health():
    return "<h1>SERVICE POSTS is healthy!</h1>", 200

if __name__ == '__main__':
    db_init()
    app.run(debug=True, host='0.0.0.0', port=5000)
