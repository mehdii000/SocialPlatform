import os
import psycopg2
from flask import Flask

app = Flask(__name__)

def get_db_connection():
    # 'db' is the hostname defined in docker-compose.yml
    conn = psycopg2.connect(
        host='db',
        database='socialdb',
        user='user',
        password='mehdi'
    )
    return conn

@app.route('/')
def test_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT version();')
        db_version = cur.fetchone()
        cur.close()
        conn.close()
        return f"<h1>Success!</h1><p>Connected to: {db_version[0]}</p>"
    except Exception as e:
        return f"<h1>Failed</h1><p>Error: {str(e)}</p>"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
