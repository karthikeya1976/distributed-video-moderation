"""Mock copyright-matching pillar (placeholder for Pex / ACRCloud fingerprinting).

Real implementation would fingerprint audio/video and match against a
rights-holder registry. This mock derives a pseudo-random "match confidence"
score from the job_id and attaches a fake reference ID when matched.
"""

from app.pillars.common import score_from_seed


async def check(job_id: str) -> dict:
    score = score_from_seed(f"copyright:{job_id}")

    flags = []
    if score >= 0.6:
        flags.append(
            {
                "timestamp": "00:00:00",
                "label": "copyright_match",
                "reference_id": f"REF-{job_id[:8].upper()}",
            }
        )

    return {"pillar": "copyright_match", "score": round(score, 3), "flags": flags}
