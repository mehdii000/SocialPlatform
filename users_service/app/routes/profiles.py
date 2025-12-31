from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

# Create the blueprint
profile_bp = Blueprint('profile_bp', __name__)

@profile_bp.route('/get')
@jwt_required
def profile():
    user_id = get_jwt_identity()
    return "User Profile With Id: {}".format(user_id), 200
