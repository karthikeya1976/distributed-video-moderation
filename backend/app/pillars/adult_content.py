"""Mock adult-content pillar (placeholder for Sightengine / AWS Rekognition Video).

Real implementation would extract frames and send them to a moderation API.
This mock derives a pseudo-random score from the job_id so results are
reproducible per video, and attaches a flag with a fake timestamp when the
score is high enough to be interesting.
"""

from app.pillars.common import score_from_seed


async def check(job_id: str) -> dict:
    score = score_from_seed(f"adult:{job_id}")

    flags = []
    if score >= 0.5:
        flags.append({"timestamp": "00:00:07", "label": "suggestive_content"})

    return {"pillar": "adult_content", "score": round(score, 3), "flags": flags}
