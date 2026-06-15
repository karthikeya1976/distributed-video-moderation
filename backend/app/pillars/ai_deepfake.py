"""Mock AI/deepfake-detection pillar (placeholder for Sightengine GenAI / Hive AI).

Real implementation would scan frames/audio for signs of synthetic media
generation (e.g., Sora, Runway, Midjourney). This mock derives a
pseudo-random "AI-generated likelihood" score from the job_id.
"""

from app.pillars.common import score_from_seed


async def check(job_id: str) -> dict:
    score = score_from_seed(f"deepfake:{job_id}")

    flags = []
    if score >= 0.7:
        flags.append({"timestamp": "00:00:03", "label": "ai_generated_content"})

    return {"pillar": "ai_deepfake", "score": round(score, 3), "flags": flags}
