# Moderation Policies

Each pillar returns a result of the form:

```json
{
  "pillar": "adult_content" | "ai_deepfake" | "copyright_match",
  "score": 0.0-1.0,
  "flags": [{"timestamp": "HH:MM:SS", "label": "..."}]
}
```

## Pillar 1: Adult Content (mock for Sightengine / AWS Rekognition Video)

- `score` = probability of explicit/suggestive content (0-1)
- Thresholds:
  - `score >= 0.8` -> contributes **Blocked**
  - `0.5 <= score < 0.8` -> contributes **Flagged**
  - `score < 0.5` -> no contribution

## Pillar 2: AI / Deepfake Detection (mock for Sightengine GenAI / Hive)

- `score` = likelihood the video contains AI-generated/synthetic media (0-1)
- Thresholds:
  - `score >= 0.7` -> contributes **Flagged** (synthetic media is disclosed/reviewed, not auto-blocked)

## Pillar 3: Copyright Match (mock for Pex / ACRCloud)

- `score` = confidence of a copyright match (0-1); `flags` includes a fake `reference_id` when matched
- Thresholds:
  - `score >= 0.6` -> contributes **Blocked** (confirmed match against rights registry)

## Aggregation Rules

The aggregator (`backend/app/aggregator.py`) evaluates all three pillar
results and produces:

```json
{
  "overall_status": "approved" | "flagged" | "blocked",
  "reasons": ["adult_content: score 0.85 >= 0.8 (blocked threshold)", ...]
}
```

Rules (evaluated in this order):

1. If **any** pillar contributes "Blocked" -> `overall_status = "blocked"`
2. Else if **any** pillar contributes "Flagged" -> `overall_status = "flagged"`
3. Else -> `overall_status = "approved"`

`reasons` lists every threshold that was crossed, across all pillars, so the
dashboard can show *why* a video was flagged/blocked.
