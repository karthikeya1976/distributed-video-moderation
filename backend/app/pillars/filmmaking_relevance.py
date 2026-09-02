"""Mock filmmaking-relevance pillar.

Real implementation would extract frames or audio and send them to a
classifier trained on filmmaking content (camera movement, cinematography,
behind-the-scenes footage, etc.).

This mock derives a deterministic score from the job_id so results are
reproducible per video. A low score means the content is likely NOT
filmmaking-related and should be blocked from the Redactor feed.
"""

from app.pillars.common import score_from_seed

# Videos scoring below this threshold are considered off-topic for Redactor
_RELEVANCE_THRESHOLD = 0.3


async def check(job_id: str) -> dict:
    score = score_from_seed(f"filmmaking:{job_id}")

    flags = []
    if score < _RELEVANCE_THRESHOLD:
        flags.append({
            "label": "not_filmmaking_content",
            "detail": f"relevance score {round(score, 3)} below threshold {_RELEVANCE_THRESHOLD}",
        })

    return {"pillar": "filmmaking_relevance", "score": round(score, 3), "flags": flags}
