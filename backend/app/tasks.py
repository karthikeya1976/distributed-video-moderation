import os
import tempfile

from celery import Celery

from app import config, db, storage

celery_app = Celery(
    "video_moderation",
    broker=config.REDIS_URL,
    backend=config.REDIS_URL,
)


@celery_app.task(name="process_video")
def process_video(job_id: str) -> None:
    job = db.get_job(job_id)
    if job is None:
        return

    db.update_job(job_id, {"status": "processing"})

    object_name = f"{job_id}.mp4"
    with tempfile.TemporaryDirectory() as tmp_dir:
        local_path = os.path.join(tmp_dir, object_name)
        storage.download_video(object_name, local_path)
        size_bytes = os.path.getsize(local_path)

    db.update_job(job_id, {"status": "received", "size_bytes": size_bytes})
