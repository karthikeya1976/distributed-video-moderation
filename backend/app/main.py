import os
import tempfile
import uuid

from fastapi import FastAPI, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from jose import jwt, JWTError
from app import db, storage
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.tasks import process_video

app = FastAPI(title="Video Moderation API")

# Ensure DB tables exist on every startup — safe because CREATE TABLE IF NOT EXISTS is idempotent
db._ensure_schema()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth setup ---
pwd_context = CryptContext(schemes=["bcrypt"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-prod")

# --- Request models ---
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpgradeRequest(BaseModel):
    department: str

# --- Auth endpoints ---
@app.post("/auth/register")
def register(req: RegisterRequest) -> dict:
    if db.get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    password_hash = pwd_context.hash(req.password)
    user = db.create_user(req.name, req.email, password_hash)
    return {"message": "Account created", "user": user}


@app.post("/auth/login")
def login(req: LoginRequest) -> dict:
    user = db.get_user_by_email(req.email)
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = jwt.encode({"sub": str(user["id"])}, JWT_SECRET, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/upgrade")
def upgrade(req: UpgradeRequest, token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.upgrade_to_creator(user_id, req.department)
    return {"message": "Account upgraded to creator", "user": user}





@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _require_creator(token: str = Depends(oauth2_scheme)) -> str:
    """Decode JWT and verify account_type == creator. Returns user_id."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user["account_type"] != "creator":
        raise HTTPException(status_code=403, detail="Creator account required to upload")
    return user_id


@app.post("/videos")
async def upload_video(file: UploadFile, user_id: str = Depends(_require_creator)) -> dict:
    task_id = str(uuid.uuid4())
    object_name = f"{task_id}.mp4"

    # Write upload to a temp file first, then upload to S3
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = os.path.join(tmp_dir, object_name)
        with open(tmp_path, "wb") as f:
            f.write(await file.read())
        file_path = storage.save_video(object_name, tmp_path)

    db.create_job(task_id, file.filename or object_name, file_path, user_id=user_id)
    process_video.delay(task_id)

    # Flow-graph response: instant acknowledgment with tracking ID
    return {"status": "processing", "task_id": task_id}


@app.get("/feed")
def get_feed(limit: int = 50) -> list:
    """Public feed — approved videos only, visible to all viewers."""
    jobs = db.get_feed(limit)
    for j in jobs:
        j["job_id"] = j.pop("_id")
        if "pillar_results" in j:
            j["pillars"] = j.pop("pillar_results")
    return jobs


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
