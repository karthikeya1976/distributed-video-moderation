"""S3-backed video storage.

Exposes three functions used by main.py and tasks.py:
  save_video    — upload a local temp file to S3, return the S3 URI
  get_video_path — return the S3 URI for a given object name
  cleanup_video  — delete the S3 object after processing is complete

The boto3 client is created once at module load time using credentials
from config.py (which reads them from .env).
"""

import boto3

from app import config

# If explicit credentials are provided (local dev), pass them directly.
# On EC2 with an IAM instance profile, leave them out so boto3 uses the
# role credentials automatically via the metadata service.
_creds = {}
if config.AWS_ACCESS_KEY_ID and config.AWS_SECRET_ACCESS_KEY:
    _creds = {
        "aws_access_key_id": config.AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": config.AWS_SECRET_ACCESS_KEY,
    }

_s3 = boto3.client("s3", region_name=config.AWS_S3_REGION, **_creds)

_BUCKET = config.AWS_S3_BUCKET


def save_video(object_name: str, src_path: str) -> str:
    """Upload src_path to S3. Returns the S3 URI s3://<bucket>/<object_name>."""
    _s3.upload_file(src_path, _BUCKET, object_name)
    return f"s3://{_BUCKET}/{object_name}"


def get_video_path(object_name: str) -> str:
    """Return the S3 URI for object_name (used by tasks.py to identify the file)."""
    return f"s3://{_BUCKET}/{object_name}"


def cleanup_video(object_name: str) -> None:
    """Delete the S3 object after processing is complete."""
    _s3.delete_object(Bucket=_BUCKET, Key=object_name)
