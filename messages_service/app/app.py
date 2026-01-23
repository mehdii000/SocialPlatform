from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import requests
from psycopg2 import pool
import os
from database_utils import db_init

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Initialize Connection Pool
db_pool = pool.SimpleConnectionPool(
    1, 10, # Min 1, Max 10 connections
    host=os.environ.get("DB_HOST"),
    database='social_db',
    user=os.environ.get("DB_USER"),
    password=os.environ.get("DB_PASSWORD")
)

user_to_sid = {}
sid_to_user = {}

# --- HELPER FUNCTIONS ---

def get_db_conn():
    return db_pool.getconn()

def release_db_conn(conn):
    db_pool.putconn(conn)

def get_or_create_conversation(cursor, user1_id, user2_id):
    # Check for existing 1-on-1 convo
    cursor.execute("""
        SELECT p1.conversation_id 
        FROM conversation_participants p1
        JOIN conversation_participants p2 ON p1.conversation_id = p2.conversation_id
        WHERE p1.user_id = %s AND p2.user_id = %s
    """, (user1_id, user2_id))
    
    row = cursor.fetchone()
    if row:
        return row[0]

    # Create new if none exists
    cursor.execute("INSERT INTO conversations DEFAULT VALUES RETURNING id")
    conv_id = cursor.fetchone()[0]
    
    cursor.execute("""
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (%s, %s), (%s, %s)
    """, (conv_id, user1_id, conv_id, user2_id))
    
    return conv_id

# --- ENDPOINTS ---

@app.route('/public/getconvo', methods=['GET'])
def get_conversations():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Username required"}), 400

    conn = get_db_conn()
    try:
        with conn.cursor() as cursor:
            # Get User ID
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            user_res = cursor.fetchone()
            if not user_res: return jsonify([]), 200
            user_id = user_res[0]

            # Fetch all conversations with the latest message
            cursor.execute("""
                SELECT 
                    c.id AS conv_id,
                    u.username AS participant_name,
                    u.profile_picture_url,
                    m.content AS last_message,
                    m.created_at AS last_message_time
                FROM conversations c
                JOIN conversation_participants p1 ON c.id = p1.conversation_id
                JOIN conversation_participants p2 ON c.id = p2.conversation_id
                JOIN users u ON p2.user_id = u.id
                LEFT JOIN LATERAL (
                    SELECT content, created_at FROM messages 
                    WHERE conversation_id = c.id 
                    ORDER BY created_at DESC LIMIT 1
                ) m ON true
                WHERE p1.user_id = %s AND p2.user_id != %s
                ORDER BY m.created_at DESC NULLS LAST;
            """, (user_id, user_id))
            
            rows = cursor.fetchall()
            convos = [{
                "id": r[0],
                "from": r[1],
                "avatar": r[2],
                "msg": r[3],
                "timestamp": r[4].isoformat() if r[4] else None
            } for r in rows]
            
            return jsonify(convos), 200
    finally:
        release_db_conn(conn)

@app.route('/public/history', methods=['GET'])
def get_message_history():
    conv_id = request.args.get('conv_id')
    
    conn = get_db_conn()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT m.id, u.username as sender_username, m.content, m.created_at
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = %s
                ORDER BY m.created_at ASC
            """, (conv_id,))
            
            rows = cursor.fetchall()
            history = [{
                "id": r[0],
                "from": r[1],
                "content": r[2],
                "timestamp": r[3].isoformat()
            } for r in rows]
            
            return jsonify(history), 200
    finally:
        release_db_conn(conn)

# --- SOCKET EVENTS ---

@socketio.on('connect')
def handle_connect():
    auth_header = request.headers.get('Authorization')
    if not auth_header: return False

    try:
        response = requests.post(
            'http://auth-service:5000/public/validate', 
            headers={'Authorization': auth_header},
            timeout=5
        )
        if response.status_code != 200: return False

        username = response.json().get('username')
        user_to_sid[username] = request.sid
        sid_to_user[request.sid] = username
        print(f"User {username} connected.")
    except Exception:
        return False

@socketio.on('disconnect')
def handle_disconnect():
    username = sid_to_user.pop(request.sid, None)
    if username:
        user_to_sid.pop(username, None)

@socketio.on('private_message')
def handle_private_message(data):
    sender_username = sid_to_user.get(request.sid)
    recipient_username = data.get('to')
    message_content = data.get('message')

    if not sender_username or not recipient_username: return

    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cursor:
                # Get IDs
                cursor.execute("SELECT id, username FROM users WHERE username IN (%s, %s)", 
                             (sender_username, recipient_username))
                id_map = {row[1]: row[0] for row in cursor.fetchall()}
                
                if len(id_map) < 2: return # One user doesn't exist

                conv_id = get_or_create_conversation(cursor, id_map[sender_username], id_map[recipient_username])

                # Save message
                cursor.execute("""
                    INSERT INTO messages (conversation_id, sender_id, content)
                    VALUES (%s, %s, %s) RETURNING created_at
                """, (conv_id, id_map[sender_username], message_content))
                created_at = cursor.fetchone()[0]

        # Emit to recipient if online
        recipient_sid = user_to_sid.get(recipient_username)
        emit_payload = {
            'from': sender_username,
            'to': recipient_username,
            'msg': message_content,
            'timestamp': created_at.isoformat()
        }
        if recipient_sid:
            emit('new_msg', emit_payload, room=recipient_sid)
            
    finally:
        release_db_conn(conn)

if __name__ == '__main__':
    db_init()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
