import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file: app/ -> backend/app -> backend -> project root)
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6380/0")

POSTGRES_URL = os.environ.get("POSTGRES_URL", "")
if not POSTGRES_URL:
    raise RuntimeError(
        "POSTGRES_URL env var is required. "
        "Copy .env.example to .env at the project root and fill in credentials."
    )

# Local temp directory for uploaded video files
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "C:/tmp/video_uploads")
