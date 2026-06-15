import os
import tempfile
import uuid

from fastapi import FastAPI, HTTPException, UploadFile

from app import db, storage
from app.tasks import process_video

app = FastAPI(title="Video Moderation API")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/videos")
async def upload_video(file: UploadFile) -> dict:
    job_id = str(uuid.uuid4())
    object_name = f"{job_id}.mp4"

    with tempfile.TemporaryDirectory() as tmp_dir:
        local_path = os.path.join(tmp_dir, object_name)
        with open(local_path, "wb") as f:
            f.write(await file.read())
        storage.upload_video(object_name, local_path)

    db.create_job(job_id, file.filename or object_name)
    process_video.delay(job_id)

    return {"job_id": job_id}


@app.get("/videos/{job_id}/status")
def get_status(job_id: str) -> dict:
    job = db.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")

    job["job_id"] = job.pop("_id")
    return job
