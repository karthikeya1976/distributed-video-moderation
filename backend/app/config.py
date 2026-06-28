import os

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6380/0")

POSTGRES_URL = os.environ.get(
    "POSTGRES_URL",
    "postgresql://*****:*****@localhost:5433/video_moderation",
)

# Local temp directory for uploaded video files
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "C:/tmp/video_uploads")
