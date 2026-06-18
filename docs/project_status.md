# Project Status

## Phase 0: Environment Setup
- [x] Python 3.11+ installed and verified (3.12.10)
- [x] Node.js / npm verified (v24.15.0 / 11.12.1)
- [x] Docker / docker compose verified (Docker 29.3.1 / Compose v5.1.1)
- [x] Project repo initialized with docs scaffold

## Milestone 1: Distributed Pipeline & Storage
- [x] docker-compose with redis, minio, mongo (api/worker run locally via venv, see note below)
- [x] POST /videos upload endpoint (stores in MinIO, creates Mongo job doc, enqueues task)
- [x] GET /videos/{job_id}/status endpoint
- [x] Celery task receives job and updates status (pending -> processing -> received)

**Note:** Docker on this machine cannot reach pypi.org during image builds (SSL
interception issue, likely VPN/AV). Redis, MinIO, and MongoDB run in Docker
(prebuilt images, no pip install needed). FastAPI app and Celery worker run
directly on Windows via a Python venv (`backend/venv`). Ports: API on 8088
(8080 was already in use), Redis mapped to 6380, Mongo to 27018.

## Milestone 2: Multi-Pillar Moderation Layer
- [x] Mock adult_content pillar
- [x] Mock ai_deepfake pillar
- [x] Mock copyright_match pillar
- [x] Aggregator combining pillar scores into approved/flagged/blocked
- [x] Status endpoint returns full breakdown (per-pillar scores, flags, reasons)

## Milestone 3: Frontend Dashboard + Scaling Demo
- [x] GET /videos list endpoint added to FastAPI + CORS middleware
- [x] Next.js 16 app scaffolded (App Router, TypeScript, Tailwind CSS)
- [x] lib/api.ts typed API client (uploadVideo, listJobs, getJobStatus + Job type)
- [x] Upload page (/) with file picker, spinner, error state
- [x] Dashboard page (/dashboard) — jobs table with 3s polling
- [x] Per-row expandable detail: pillar score bars + flag timeline + reasons
- [x] Status/verdict color badges (approved=green, flagged=amber, blocked=red)
- [x] README.md with run instructions + interview cheat sheet
- [x] Final docs pass (architecture.md, changelog.md updated)
- [ ] Worker scaling demo (run manually: start 3 worker terminals, upload 5+ videos)
