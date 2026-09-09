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

## Milestone 4: v2 Architecture Upgrade (2026-06-28)
- [x] PostgreSQL replaces MongoDB (db.py rewritten, docker-compose updated)
- [x] Temp disk replaces MinIO (storage.py rewritten, UPLOAD_DIR config)
- [x] decision_engine.py replaces aggregator.py (rename only, no logic change)
- [x] POST /videos returns {status, task_id} (flow-graph response shape)
- [x] tasks.py updated: temp disk read, decision_engine import, cleanup_video
- [x] requirements.txt updated: pymongo+minio removed, psycopg2-binary added
- [x] frontend/lib/api.ts: uploadVideo return type updated to {task_id, status}
- [x] e2e tests updated and passing (15/15) against new stack
- [x] docs updated (changelog, architecture, project_status, CLAUDE.md)

## Redactor MVP (2026-09-08)
- [x] JWT auth system: register, login, upgrade (viewer → creator)
- [x] users table in PostgreSQL with account_type + department
- [x] POST /videos requires Creator JWT; user_id stored on video rows
- [x] GET /feed returns approved videos only (public)
- [x] S3 storage via boto3 (replaces local disk)
- [x] IAM instance profile support (no hardcoded keys on EC2)
- [x] 4th pillar: filmmaking_relevance (inverse scoring, block below 0.3)
- [x] BLOCK_BELOW_THRESHOLDS in decision_engine.py
- [x] Dark-theme frontend redesign (selenium blue accent, #0a0a0f bg)
- [x] Collapsed vertical sidebar with icon-only + hover-expand labels
- [x] 4 pages: / (auth), /feed, /upload, /profile
- [x] frontend/lib/auth.ts: localStorage JWT helpers
- [x] NEXT_PUBLIC_API_URL env var for configurable API base

## AWS Deployment (2026-09-09)
- [x] CloudFormation stack: VPC, subnets, IGW, security groups
- [x] RDS PostgreSQL 15.19 (db.t3.micro) — redactor-db
- [x] ElastiCache Redis (cache.t3.micro) — redactor-redis
- [x] EC2 t3.small (Amazon Linux 2023) — public IP 18.216.199.64
- [x] IAM role: AmazonSSMManagedInstanceCore + S3 access
- [x] Systemd services: redactor-api + redactor-celery (auto-restart, survive reboots)
- [x] End-to-end verified on AWS: register → login → upload → S3 → Celery → RDS → result
- [ ] CloudFormation UserData bootstrap fixed (venv path, root ownership) for automated redeploys
- [ ] Frontend deployed to a public URL (currently local only, points at EC2 API)
