import os
import shutil

from app import config


def _ensure_upload_dir() -> None:
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)


def save_video(object_name: str, src_path: str) -> str:
    """Copy uploaded file into UPLOAD_DIR. Returns the destination path."""
    _ensure_upload_dir()
    dest = os.path.join(config.UPLOAD_DIR, object_name)
    shutil.copy2(src_path, dest)
    return dest


def get_video_path(object_name: str) -> str:
    """Return the full path of a stored video (no download needed — already on disk)."""
    return os.path.join(config.UPLOAD_DIR, object_name)


def cleanup_video(object_name: str) -> None:
    """Delete the temp file after processing is complete (mirrors Stage C cleanup)."""
    path = os.path.join(config.UPLOAD_DIR, object_name)
    if os.path.exists(path):
        os.remove(path)
