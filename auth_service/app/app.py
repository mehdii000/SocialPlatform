import os
import psycopg2
import requests
import bcrypt
from flask import Flask

app = Flask(__name__)

def get_db_connection():
    # 'db' is the hostname defined in docker-compose.yml
    conn = psycopg2.connect(
        host='db',
        database='auth_db',
        user='user',
        password='mehdi'
    )
    return conn

    
@app.route('/health')
def health():
    try:
        response = requests.get('http://users-service:5000/health')
        if response.status_code == 200:
            return "<h1>AUTH SERVICE is healthy & USERS SERVICE is healthy!"
        else:
            return "<h1>AUTH SERVICE is healthy but USERS SERVICE is down!</h1>"
    except Exception as e:
        return f"<h1>AUTH SERVICE is down but USERS SERVICE is down!</h1><p>Error: {str(e)}</p>"

if __name__ == '__main__':
    
    app.run(debug=True, host='0.0.0.0', port=5000)
