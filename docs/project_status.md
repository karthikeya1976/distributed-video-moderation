# Project Status

## Phase 0: Environment Setup
- [ ] Python 3.11+ installed and verified
- [ ] Node.js / npm verified (already installed)
- [ ] Docker / docker compose verified
- [ ] Project repo initialized with docs scaffold

## Milestone 1: Distributed Pipeline & Storage
- [ ] docker-compose with redis, minio, mongo, api, worker
- [ ] POST /videos upload endpoint (stores in MinIO, creates Mongo job doc, enqueues task)
- [ ] GET /videos/{job_id}/status endpoint
- [ ] Celery task receives job and updates status

## Milestone 2: Multi-Pillar Moderation Layer
- [ ] Mock adult_content pillar
- [ ] Mock ai_deepfake pillar
- [ ] Mock copyright_match pillar
- [ ] Aggregator combining pillar scores into Approved/Flagged/Blocked
- [ ] Status endpoint returns full breakdown

## Milestone 3: Frontend Dashboard + Scaling Demo
- [ ] Next.js app with upload page
- [ ] Dashboard page listing jobs with status + details
- [ ] GET /videos list endpoint
- [ ] Worker scaling demo
- [ ] Final docs pass + README
