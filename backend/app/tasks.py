import asyncio
import os
import tempfile

from celery import Celery

from app import config, db, storage
from app.aggregator import aggregate
from app.pillars import adult_content, ai_deepfake, copyright_match

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

    pillar_results = asyncio.run(_run_pillars(job_id))
    verdict = aggregate(pillar_results)

    db.update_job(
        job_id,
        {
            "status": "done",
            "size_bytes": size_bytes,
            "overall_status": verdict["overall_status"],
            "reasons": verdict["reasons"],
            "pillars": pillar_results,
        },
    )
