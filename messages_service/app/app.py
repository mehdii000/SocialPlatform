from flask import Flask, request
from flask_socketio import SocketIO, emit
import requests 

app = Flask(__name__)
# 'async_mode="eventlet"' is what allows the long-lived connections
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Your Connection Map
user_to_sid = {}

@socketio.on('connect')
def handle_connect():
    token = request.headers.get('Authorization')
    response = requests.post('http://auth-service:5000/public/validate', headers=request.headers)

    if response.status_code != 200:
        print("Validation failed!")
        print(response)
        return False  # Socket.IO: returning False rejects the connection

    user_to_sid[response.json().get('username')] = request.sid
    print(f"User {response.json().get('username')} connected. SID: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    token = request.headers.get('Authorization')
    
    response = requests.post('http://auth-service:5000/public/validate', headers=request.headers)

    if response.status_code != 200:
        print("Validation failed! Can't disconnect.")
        print(response)
        return False  # Socket.IO: returning False rejects the connection
    
    username = response.json().get('username')
    for user, user_sid in user_to_sid.items():
        if user_sid == sid:
            username = user
            break
    if username:
        del user_to_sid[username]
        print(f"User {username} disconnected. SID: {sid}")
    else:
        print(f"Unknown SID {sid} disconnected.")

@socketio.on('message')
def handle_message(data):
    message = data.get('message')
    sender = data.get('sender')
    
    print(f"sending message: {message}")
    emit('new_msg', {'msg': message, 'from': sender}, include_self=False, broadcast=True)

@socketio.on('typing')
def handle_typing(data):
    sender = data.get('sender')
    print(f"{sender} is typing...")
    emit('user_typing', {'sender': sender}, include_self=False, broadcast=True)

if __name__ == '__main__':
    # You use socketio.run instead of app.run
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
