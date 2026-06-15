from datetime import datetime, timezone
from typing import Any, Optional

from pymongo import MongoClient

from app import config

_client = MongoClient(config.MONGO_URL)
_db = _client[config.MONGO_DB_NAME]
jobs = _db["jobs"]


def create_job(job_id: str, filename: str) -> None:
    jobs.insert_one(
        {
            "_id": job_id,
            "filename": filename,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )


def update_job(job_id: str, fields: dict[str, Any]) -> None:
    fields["updated_at"] = datetime.now(timezone.utc)
    jobs.update_one({"_id": job_id}, {"$set": fields})


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    return jobs.find_one({"_id": job_id})


def list_jobs(limit: int = 50) -> list[dict[str, Any]]:
    return list(jobs.find().sort("created_at", -1).limit(limit))
