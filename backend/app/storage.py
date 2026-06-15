from minio import Minio
from minio.error import S3Error

from app import config

_client = Minio(
    config.MINIO_ENDPOINT,
    access_key=config.MINIO_ACCESS_KEY,
    secret_key=config.MINIO_SECRET_KEY,
    secure=config.MINIO_SECURE,
)


def ensure_bucket() -> None:
    if not _client.bucket_exists(config.MINIO_BUCKET):
        _client.make_bucket(config.MINIO_BUCKET)


def upload_video(object_name: str, file_path: str) -> None:
    ensure_bucket()
    _client.fput_object(config.MINIO_BUCKET, object_name, file_path)


def download_video(object_name: str, dest_path: str) -> None:
    _client.fget_object(config.MINIO_BUCKET, object_name, dest_path)


def object_exists(object_name: str) -> bool:
    try:
        _client.stat_object(config.MINIO_BUCKET, object_name)
        return True
    except S3Error:
        return False
