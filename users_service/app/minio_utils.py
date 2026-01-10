import os
import uuid
from minio import Minio
from werkzeug.utils import secure_filename

minio_client = Minio(
    "minio:9000",
    access_key="minioadmin",
    secret_key="minioadminpassword",
    secure=False
)

BUCKET_NAME = "profiles"

import json

def ensure_bucket_public(bucket_name):
    # 1. Ensure bucket exists
    if not minio_client.bucket_exists(bucket_name):
        minio_client.make_bucket(bucket_name)

    # 2. Define the 'ReadOnly' policy for anonymous users
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                "Resource": [f"arn:aws:s3:::{bucket_name}"]
            },
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
            }
        ]
    }

    # 3. Apply the policy
    minio_client.set_bucket_policy(bucket_name, json.dumps(policy))

def upload_media(file):
    # Ensure bucket exists
    if not minio_client.bucket_exists(BUCKET_NAME):
        minio_client.make_bucket(BUCKET_NAME)

    # Create a unique filename: uuid_original.jpg
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    minio_client.put_object(
        BUCKET_NAME,
        unique_name,
        file,
        length=size,
        content_type=file.content_type
    )
    return unique_name
