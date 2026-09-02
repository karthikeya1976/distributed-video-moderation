import asyncio
import os

from celery import Celery

from app import config, db, storage
from app.decision_engine import aggregate
from app.pillars import adult_content, ai_deepfake, copyright_match, filmmaking_relevance

celery_app = Celery(
    "video_moderation",
    broker=config.REDIS_URL,
    backend=config.REDIS_URL,
)


async def _run_pillars(job_id: str) -> list[dict]:
    return await asyncio.gather(
        adult_content.check(job_id),
        ai_deepfake.check(job_id),
        copyright_match.check(job_id),
        filmmaking_relevance.check(job_id),
    )


@celery_app.task(name="process_video")
def process_video(job_id: str) -> None:
    job = db.get_job(job_id)
    if job is None:
        return

    db.update_job(job_id, {"status": "processing"})

    object_name = f"{job_id}.mp4"

    # File is already on local disk — no download needed
    file_path = storage.get_video_path(object_name)
    size_bytes = os.path.getsize(file_path) if os.path.exists(file_path) else 0

    # Placeholder for Moderation Worker stages (mock pillars run concurrently)
    pillar_results = asyncio.run(_run_pillars(job_id))

    # Decision Engine: compile pillar scores → overall verdict
    verdict = aggregate(pillar_results)

    db.update_job(
        job_id,
        {
            "status": "done",
            "size_bytes": size_bytes,
            "overall_status": verdict["overall_status"],
            "reasons": verdict["reasons"],
            "pillar_results": pillar_results,
        },
    )

    # Stage C analog: remove temp file after processing is complete
    storage.cleanup_video(object_name)
