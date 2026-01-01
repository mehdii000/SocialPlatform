from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database_utils import db_get_user_by_email


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
