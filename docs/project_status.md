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
- [ ] Next.js app with upload page
- [ ] Dashboard page listing jobs with status + details
- [ ] GET /videos list endpoint
- [ ] Worker scaling demo
- [ ] Final docs pass + README
