# Architecture

## System Diagram

```
[Next.js Frontend] --(upload)--> [FastAPI Backend] --> [MinIO (S3-compatible, local)]
                                        |
                                        v
                              [Redis Queue] --(Celery tasks)--> [Worker(s)]
                                                                     |
                                              +----------------------+----------------------+
                                              v                      v                      v
                                    [Mock Adult Content]   [Mock AI/Deepfake]      [Mock Copyright/Pex]
                                              |                      |                      |
                                              +----------------------+----------------------+
                                                                     v
                                                          [Aggregator: combine scores
                                                           -> approved/flagged/blocked]
                                                                     v
                                                          [MongoDB: store job + result]
                                                                     v
                                              [FastAPI status endpoint] --> [Next.js dashboard polls/displays]
```

## Components

### FastAPI Backend (`backend/app/main.py`)
- `GET /health` — liveness check
- `POST /videos` — accepts an uploaded video file, generates a `job_id`
  (UUID), uploads the file to MinIO (`storage.py`), creates a job document in
  MongoDB (`db.py`) with `status: "pending"`, and enqueues `process_video`
  via Celery
- `GET /videos/{job_id}/status` — returns the current job document (status,
  per-pillar results, overall verdict, reasons)
- `GET /videos` — paginated list of jobs (Milestone 3, for the dashboard)

### Storage — MinIO (`backend/app/storage.py`)
- S3-compatible object storage running locally via Docker
- Stands in for Cloudflare R2 / AWS S3 from the original spec
- Bucket: `videos`; objects are named `{job_id}.mp4`

### Database — MongoDB (`backend/app/db.py`)
- Stores one document per job in the `jobs` collection
- Stands in for the "application data" store (MongoDB Atlas/Supabase in the
  original spec)
- Job document shape (after processing):
  ```json
  {
    "_id": "<job_id>",
    "filename": "...",
    "status": "pending | processing | done",
    "size_bytes": 12345,
    "overall_status": "approved | flagged | blocked",
    "reasons": ["adult_content: score 0.93 >= 0.8 (blocked threshold)"],
    "pillars": [
      {"pillar": "adult_content", "score": 0.93, "flags": [...]},
      {"pillar": "ai_deepfake", "score": 0.41, "flags": [...]},
      {"pillar": "copyright_match", "score": 0.58, "flags": [...]}
    ],
    "created_at": "...",
    "updated_at": "..."
  }
  ```

### Queue & Workers — Redis + Celery (`backend/app/tasks.py`)
- Redis acts as both the Celery broker and result backend
- Stands in for BullMQ/Redis or Celery/RabbitMQ from the original spec
- `process_video(job_id)` Celery task:
  1. Sets status to `processing`
  2. Downloads the video from MinIO
  3. Runs all three pillar checks concurrently (`asyncio.gather`)
  4. Aggregates results into an overall verdict
  5. Writes final results to the job document, sets status to `done`
- Scaling: running multiple worker containers/processes lets multiple jobs
  process in parallel (demonstrated in Milestone 3)

### Moderation Pillars (`backend/app/pillars/`)
Each pillar module exposes:
```python
async def check(job_id: str) -> dict
# returns {"pillar": str, "score": float (0-1), "flags": [{"timestamp": ..., "label": ...}]}
```
- `adult_content.py` — mock for Sightengine / AWS Rekognition Video
- `ai_deepfake.py` — mock for Sightengine GenAI / Hive AI
- `copyright_match.py` — mock for Pex / ACRCloud
- `common.py` — shared helper (`score_from_seed`) that derives a
  deterministic pseudo-random score from a seed string, so mock results are
  reproducible per video without a real ML model

This common interface is the key design decision that makes pillars
swappable: replacing a mock with a real API call means editing one file,
not the orchestration logic in `tasks.py`.

### Aggregator (`backend/app/aggregator.py`)
- Reads all three pillar results
- Applies thresholds from `docs/moderation_policies.md`
- Returns `{"overall_status": "approved|flagged|blocked", "reasons": [...]}`
- Rule order: any "blocked" pillar -> `blocked`; else any "flagged" pillar ->
  `flagged`; else `approved`

### Frontend — Next.js Dashboard (Milestone 3, `frontend/`)
- Upload page: posts to `POST /videos`
- Dashboard page: polls `GET /videos`, shows a table of jobs with status
  badges and a details view per job showing per-pillar scores and a
  timestamped flag timeline

## Local Development Topology

Due to a Docker network limitation on this machine (see `CLAUDE.md` Area 4),
the topology differs slightly from a fully containerized deployment:

- **Dockerized** (via `docker-compose.yml`): Redis (host port 6380), MinIO
  (9000/9001), MongoDB (host port 27018, container `video-mod-mongo`)
- **Run locally** (via `backend/venv`): FastAPI app (port 8088), Celery
  worker
- Both connect to the Dockerized infra via `localhost` + mapped ports
  (see `backend/app/config.py`)

In a fully containerized deployment, the API/worker would run as their own
services in `docker-compose.yml`, connecting to `redis`/`minio`/`mongo` via
Docker service names (a `backend/Dockerfile` already exists for this).
