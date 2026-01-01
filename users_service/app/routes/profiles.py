from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database_utils import (
    db_get_user_by_email,
    db_get_public_user_by_username,
    db_update_user_bio
)


# Create the blueprint
profile_bp = Blueprint('profile_bp', __name__)

@profile_bp.route('/get', methods=['GET'])
@jwt_required()
def profile():
    user_email = get_jwt_identity()
    print("A protected route was accessed by:", user_email)
    user = db_get_user_by_email(user_email)
    if user:
        return jsonify(user), 200
    return jsonify({"msg": "User not found"}), 404

@profile_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_profile():
    user_email = get_jwt_identity()
    user = db_get_user_by_email(user_email)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"msg": "No input data provided"}), 400

    if 'bio' in data:
        db_update_user_bio(user_email, data['bio'])
        user['bio'] = data['bio']

    
    return jsonify(user), 200

# /getpublic GET endpoint that takes a ?username param to get public info on a profile
@profile_bp.route('/getpublic', methods=['GET'])
#@jwt_required()
def get_public_profile():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Missing username parameter"}), 400

    info = db_get_public_user_by_username(username)
    if info:
        return jsonify(info), 200
    return jsonify({"msg": "User not found"}), 404
