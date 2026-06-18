# Distributed Video Moderation Platform

A fully local, runnable distributed video moderation system built with
FastAPI, Celery, Redis, MinIO, MongoDB, and a Next.js dashboard.

## Architecture

```
[Next.js Frontend :3000]
        |  upload video
        v
[FastAPI API :8088]  -->  [MinIO :9000]  (object storage)
        |
        v
[Redis :6380]  (task queue)
        |
        v
[Celery Worker(s)]
   |         |          |
   v         v          v
Adult     AI/Deepfake  Copyright
Content   Detection    Match
   |         |          |
   +---------+----------+
             |
             v
        [Aggregator]
     approved / flagged / blocked
             |
             v
        [MongoDB :27018]
             |
             v
[FastAPI status endpoint] <-- [Dashboard polls every 3s]
```

## How to Run

### 1. Start infrastructure (Docker required)
```bash
docker compose up -d
```
This starts Redis (port 6380), MinIO (9000/9001), and MongoDB (27018).

### 2. Start the API server
```bash
cd backend
venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8088
```

### 3. Start a Celery worker
```bash
cd backend
venv\Scripts\python -m celery -A app.tasks.celery_app worker --loglevel=info --pool=solo
```

### 4. Start the Next.js dashboard
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** — upload a video, then go to the Dashboard to
watch it process in real time.

### Scaling demo (multiple workers)
Open 3 terminal windows and run the Step 3 command in each. Then upload
several videos quickly. Each worker picks up jobs from the shared Redis queue
and processes them in parallel — you'll see multiple jobs moving through
`processing → done` simultaneously.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness check |
| POST | `/videos` | Upload a video (multipart form, field `file`) |
| GET | `/videos` | List all jobs (newest first) |
| GET | `/videos/{job_id}/status` | Get full job result |

### Job response shape (after processing)
```json
{
  "job_id": "uuid",
  "filename": "video.mp4",
  "status": "done",
  "overall_status": "approved | flagged | blocked",
  "reasons": ["adult_content: score 0.93 >= 0.8 (blocked threshold)"],
  "pillars": [
    {"pillar": "adult_content", "score": 0.93, "flags": [{"timestamp": "00:00:07", "label": "suggestive_content"}]},
    {"pillar": "ai_deepfake",   "score": 0.41, "flags": []},
    {"pillar": "copyright_match","score": 0.58, "flags": []}
  ],
  "size_bytes": 50000,
  "created_at": "...",
  "updated_at": "..."
}
```

## How to Explain This in an Interview

| Question | Answer |
|----------|--------|
| **What does this system do?** | Intercepts video uploads and runs them through three safety checks (adult content, AI/deepfake detection, copyright) asynchronously before a video is cleared for public viewing. |
| **Why FastAPI?** | High-performance async Python web framework — handles file uploads without blocking, native async support fits the async-worker model. |
| **Why Redis + Celery?** | Redis is the message broker — the API drops a job onto the queue without waiting for processing. Celery workers pick it up asynchronously. This decouples the upload from the slow moderation work and lets you scale workers independently. |
| **Why MinIO?** | S3-compatible object storage running locally. In production this would be Cloudflare R2 or AWS S3. The code only changes in `config.py` (endpoint/credentials). |
| **Why MongoDB?** | Schema-flexible document store — each job document grows as results arrive (pending → processing → done + pillar scores), without needing schema migrations. |
| **What are the three pillars?** | Adult Content (would use Sightengine/AWS Rekognition), AI/Deepfake (Sightengine GenAI/Hive), Copyright (Pex/ACRCloud). Each is a pluggable module with the same `async def check(job_id) -> dict` interface — swapping mock for real API is one file change. |
| **How does the aggregator work?** | Reads all three pillar scores, applies thresholds from `docs/moderation_policies.md` (e.g., adult > 0.8 → Blocked), returns `approved/flagged/blocked` + a list of reasons. |
| **How did you improve throughput?** | Running multiple Celery workers picks up tasks from the shared Redis queue in parallel — horizontal scaling with no code changes. |
| **What's the dashboard polling interval?** | 3 seconds while any job is still in `pending/processing` state; stops polling once all jobs are `done`. |
| **What would you change for production?** | Replace mock pillars with real API clients, swap MinIO for S3/R2, add webhook callbacks (so workers push results instead of writing to DB directly), add auth, rate limiting, and dead-letter queues for failed moderation calls. |

## Project Docs
- `docs/project_spec.md` — product spec and roadmap
- `docs/architecture.md` — system design and component breakdown
- `docs/moderation_policies.md` — per-pillar thresholds and aggregation rules
- `docs/project_status.md` — milestone tracker
- `docs/changelog.md` — implementation history
- `CLAUDE.md` — project context and guidelines (six areas)
