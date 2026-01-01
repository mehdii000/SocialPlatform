from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database_utils import db_get_user_by_id


# Create the blueprint
profile_bp = Blueprint('profile_bp', __name__)

@profile_bp.route('/get')
@jwt_required
def profile():
    user_id = get_jwt_identity()
    user = db_get_user_by_id(user_id)
    if user:
        return jsonify(user), 200
    return jsonify({"msg": "User not found"}), 404
