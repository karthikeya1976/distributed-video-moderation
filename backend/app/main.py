import os
import tempfile
import uuid

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app import db, storage
from app.tasks import process_video

app = FastAPI(title="Video Moderation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/videos")
async def upload_video(file: UploadFile) -> dict:
    task_id = str(uuid.uuid4())
    object_name = f"{task_id}.mp4"

    # Write upload to a temp file first, then persist to UPLOAD_DIR
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = os.path.join(tmp_dir, object_name)
        with open(tmp_path, "wb") as f:
            f.write(await file.read())
        file_path = storage.save_video(object_name, tmp_path)

    db.create_job(task_id, file.filename or object_name, file_path)
    process_video.delay(task_id)

    # Flow-graph response: instant acknowledgment with tracking ID
    return {"status": "processing", "task_id": task_id}


@app.get("/videos")
def list_videos(limit: int = 50) -> list:
    jobs = db.list_jobs(limit)
    for j in jobs:
        j["job_id"] = j.pop("_id")
        if "pillar_results" in j:
            j["pillars"] = j.pop("pillar_results")
    return jobs


@app.get("/videos/{job_id}/status")
def get_status(job_id: str) -> dict:
    job = db.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")

    job["job_id"] = job.pop("_id")
    if "pillar_results" in job:
        job["pillars"] = job.pop("pillar_results")
    return job
