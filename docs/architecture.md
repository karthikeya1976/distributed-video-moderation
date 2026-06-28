# Architecture

## System Diagram (v2 — Milestone 4)

```
[ Next.js Frontend ]
        │ HTTP POST (video file)
        ▼
[ FastAPI Gateway ]
  ├── Generate UUID task_id
  ├── Save video to UPLOAD_DIR/{task_id}.mp4  (temp local disk)
  ├── Push task_id to Redis Queue via Celery
  └── Return {"status": "processing", "task_id": "..."}  (instant ack)
        │
        │ Redis Queue pull
        ▼
[ Celery Worker ]
  ├── [Mock Moderation Pillars — placeholder for real Moderation Worker]
  │     ├── adult_content.check(task_id)
  │     ├── ai_deepfake.check(task_id)
  │     └── copyright_match.check(task_id)
  │
  └── [ Decision Engine (decision_engine.py) ]
        └── Compiles scores → approved / flagged / blocked
        │
        │ SQL write
        ▼
[ PostgreSQL Database ]
  └── videos table: id, filename, file_path, status, overall_status,
                    pillar_results (JSONB), reasons (JSONB),
                    size_bytes, created_at, updated_at
        │
        ▼
[ FastAPI status endpoint ] ──► [ Next.js dashboard polls / displays ]
```

## Components

### FastAPI Gateway (`backend/app/main.py`)
- `GET /health` — liveness check
- `POST /videos` — accepts an uploaded video file, generates a `task_id`
  (UUID), saves the file to `UPLOAD_DIR` (`storage.py`), creates a row in
  PostgreSQL (`db.py`) with `status: "pending"`, enqueues `process_video`
  via Celery, and returns `{"status": "processing", "task_id": "<uuid>"}`
  immediately (non-blocking)
- `GET /videos/{job_id}/status` — returns the current job row (status,
  per-pillar results, overall verdict, reasons)
- `GET /videos` — paginated list of jobs (newest first)

### Storage — Temp Local Disk (`backend/app/storage.py`)
- Uploaded videos are saved to `UPLOAD_DIR` (default: `C:/tmp/video_uploads/`)
  using `os`/`shutil` — no external service required
- `save_video(object_name, src_path)` — persists file, returns dest path
- `get_video_path(object_name)` — returns the path (no download needed)
- `cleanup_video(object_name)` — deletes temp file after processing

### Database — PostgreSQL (`backend/app/db.py`)
- `videos` table stores one row per job
- `psycopg2-binary` driver; table created automatically on startup
- Row schema:
  ```
  id             TEXT PRIMARY KEY
  filename       TEXT
  file_path      TEXT
  status         TEXT  (pending | processing | done)
  overall_status TEXT  (approved | flagged | blocked)
  pillar_results JSONB
  reasons        JSONB
  size_bytes     INTEGER
  created_at     TIMESTAMPTZ
  updated_at     TIMESTAMPTZ
  ```
- API response maps `pillar_results` → `pillars` for frontend compatibility

### Queue & Workers — Redis + Celery (`backend/app/tasks.py`)
- Redis acts as both the Celery broker and result backend
- `process_video(task_id)` Celery task:
  1. Sets status to `processing`
  2. Reads file from local disk via `storage.get_video_path()`
  3. Runs all three pillar checks concurrently (`asyncio.gather`)
  4. Passes results to Decision Engine
  5. Writes final results to PostgreSQL, sets status to `done`
  6. Calls `storage.cleanup_video()` to remove the temp file
- Scaling: multiple worker processes handle concurrent jobs

### Moderation Pillars (`backend/app/pillars/`)
Each pillar module exposes:
```python
async def check(job_id: str) -> dict
# returns {"pillar": str, "score": float (0-1), "flags": [{"timestamp": ..., "label": ...}]}
```
- `adult_content.py` — mock for Sightengine / AWS Rekognition Video
- `ai_deepfake.py` — mock for Sightengine GenAI / Hive AI
- `copyright_match.py` — mock for Pex / ACRCloud
- `common.py` — `score_from_seed()` derives a deterministic pseudo-random
  score from a seed string so mock results are reproducible per video

Pillars are placeholders for the real Moderation Worker stages (FFmpeg
pre-processing, vision/OCR/audio checks). The common interface makes each
one swappable: replacing a mock with a real API client means editing one
file, not the orchestration logic.

### Decision Engine (`backend/app/decision_engine.py`)
- Standalone module (renamed from `aggregator.py` in Milestone 4)
- Reads all three pillar results; applies thresholds from
  `docs/moderation_policies.md`
- Returns `{"overall_status": "approved|flagged|blocked", "reasons": [...]}`
- Rule: any blocked-threshold pillar → `blocked`; else any
  flagged-threshold pillar → `flagged`; else `approved`

### Frontend — Next.js Dashboard (`frontend/`)
- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **API client** (`lib/api.ts`): typed wrapper around all three backend
  endpoints; single place to change `API` base URL
- **Upload page** (`app/page.tsx` → `components/upload-form.tsx`):
  file picker, calls `POST /videos`, shows spinner during upload, redirects
  to `/dashboard` on success
- **Dashboard page** (`app/dashboard/page.tsx` → `components/jobs-table.tsx`):
  polls `GET /videos` every 3 seconds while any job is still in
  `pending/processing` state; stops polling once all jobs are done
- **Job detail** (`components/job-detail.tsx`): toggled per-row — shows
  three pillar score bars (color-coded by threshold: green/amber/red),
  flag timeline (`[HH:MM:SS] — label`), and policy trigger reasons
- **Verdict badges** (in `components/ui/badge.tsx`): green=approved,
  amber=flagged, red=blocked, blue=processing, gray=pending

## Local Development Topology

Due to a Docker network limitation on this machine (see `CLAUDE.md` Area 4),
the topology differs slightly from a fully containerized deployment:

- **Dockerized** (via `docker-compose.yml`): Redis (host port 6380),
  PostgreSQL (host port 5433)
- **Run locally** (via `backend/venv`): FastAPI app (port 8088), Celery
  worker
- Both connect to the Dockerized infra via `localhost` + mapped ports
  (see `backend/app/config.py`)
- Uploaded files are stored on the Windows filesystem at `C:/tmp/video_uploads/`

In a fully containerized deployment, the API/worker would run as their own
services in `docker-compose.yml`, connecting to `redis`/`postgres` via
Docker service names, and `UPLOAD_DIR` would be a shared Docker volume.
