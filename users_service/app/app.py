import os
import psycopg2
from flask import Flask

app = Flask(__name__)

def get_db_connection():
    # 'db' is the hostname defined in docker-compose.yml
    conn = psycopg2.connect(
        host='db',
        database='users_db',
        user='user',
        password='mehdi'
    )
    return conn

@app.route('/health')
def health():
    return "<h1>SERVICE USERS is healthy!</h1>", 200

if __name__ == '__main__':

    app.run(debug=True, host='0.0.0.0', port=5000)
