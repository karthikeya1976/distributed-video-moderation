import hashlib


def score_from_seed(seed: str) -> float:
    """Derive a deterministic pseudo-random score in [0, 1] from a seed string.

    Lets mock pillars return varied-but-reproducible results per video,
    without needing a real ML model.
    """
    digest = hashlib.sha256(seed.encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF
