import os
import psycopg2
import requests
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

@app.route('/like')
def like():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Increment the total_likes count
        cur.execute("UPDATE likes SET total_likes = total_likes + 1;")
        conn.commit()
        # Retrieve the updated total_likes count
        cur.execute("SELECT total_likes FROM likes;")
        total_likes = cur.fetchone()[0]
        cur.close()
        conn.close()
        return f"<h1>Liked!</h1><p>Total Likes: {total_likes}</p>"
    except Exception as e:
        return f"<h1>Error</h1><p>{str(e)}</p>"
    
@app.route('/gettest')
def get_test():
    # Send a GET request to http://users-service:5001/test and return response
    try:
        response = requests.get('http://users-service:5001/test')
        return f"<h1>Response from users-service:</h1> <br> {response.text}"
    except Exception as e:
        return f"<h1>Error contacting users-service:</h1><p>{str(e)}</p>"
        


if __name__ == '__main__':
    # Create a TotalLikes global variable and set its initial value to 0 if it doesnt exist using db
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS likes (id SERIAL PRIMARY KEY, total_likes INTEGER DEFAULT 0);")
    cur.execute("INSERT INTO likes (total_likes) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM likes);")
    conn.commit()
    cur.close()
    conn.close()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
