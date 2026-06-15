import os

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6380/0")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27018")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "video_moderation")

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "videos")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"
