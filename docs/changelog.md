# Changelog

## 2026-06-14
- Project initialized: repo, docs scaffold, .gitignore, CLAUDE.md created.

## 2026-06-15
- Milestone 1 complete: FastAPI app (`backend/app/main.py`) with `/health`,
  `POST /videos`, `GET /videos/{job_id}/status`. MinIO storage helper
  (`storage.py`), Mongo job helpers (`db.py`), Celery task `process_video`
  (`tasks.py`) that downloads from MinIO and updates job status.
  Infra (redis, minio, mongo) via docker-compose; API/worker run in a local
  Python venv due to a Docker build network issue (see project_status.md).
  Verified end-to-end with a test upload: pending -> processing -> received,
  file confirmed in MinIO and job document confirmed in MongoDB.
- Milestone 2 complete: added `docs/moderation_policies.md` with per-pillar
  thresholds. Implemented mock pillars (`backend/app/pillars/`):
  `adult_content.py`, `ai_deepfake.py`, `copyright_match.py` (each derives a
  deterministic pseudo-random score from the job_id via `common.py`).
  Added `aggregator.py` combining pillar scores into
  approved/flagged/blocked with reasons. `tasks.py` now runs all three
  pillars concurrently (asyncio.gather) and stores full results on the job
  document. Verified with 5 test uploads producing all three outcomes
  (approved, flagged, blocked) with correct reasons and flags.
- Restructured `CLAUDE.md` into six areas (Project Goals, Architecture
  Overview, Design Style Guide, Constraints & Policies, Repository
  Etiquette, Documentation) and added a documentation update rule. Added
  `docs/project_spec.md` (full product spec + roadmap from the original
  briefing, with a mapping table showing how each spec item maps to this
  build) and `docs/architecture.md` (expanded system design, component
  breakdown, job document schema, local dev topology).

## 2026-06-17
- Milestone 3 complete: added CORS middleware and `GET /videos` list endpoint
  to `backend/app/main.py`. Scaffolded Next.js 16 frontend (`frontend/`) with
  App Router, TypeScript, Tailwind CSS. Built typed API client (`lib/api.ts`),
  upload page with file picker + spinner (`/`), and moderation dashboard
  (`/dashboard`) with live 3-second polling, per-job expandable detail rows
  showing pillar score progress bars, flag timelines with timestamps, and
  policy trigger reasons. Color-coded verdict badges (approved=green,
  flagged=amber, blocked=red). Both pages serve 200 and compile without
  errors. CORS verified with preflight OPTIONS returning correct
  `access-control-allow-origin` header. Added `README.md` with run
  instructions and an interview cheat sheet covering every component.
  Scaling demo: run `venv\Scripts\python -m celery ... worker` in 3 terminals
  simultaneously and upload 5+ videos to observe parallel processing.

## 2026-06-28 — v2 Architecture Upgrade (Milestone 4)
Upgraded infrastructure to match the target flow graph. Moderation Worker
stages (FFmpeg pre-processing, sequential vision/OCR/audio checks, disk
cleanup) are excluded per spec; mock pillars remain as placeholders.

Changes:
- **PostgreSQL replaces MongoDB**: `db.py` rewritten with `psycopg2-binary`;
  `videos` table with JSONB columns for `pillar_results` and `reasons`.
  `docker-compose.yml` now runs `postgres:15-alpine` on host port 5433 instead
  of `mongo:6`.
- **Temp disk replaces MinIO**: `storage.py` rewritten to use `os`/`shutil`
  to persist uploads to `C:/tmp/video_uploads/` (configurable via `UPLOAD_DIR`
  env var). MinIO service removed from `docker-compose.yml`.
- **Decision Engine**: `aggregator.py` renamed to `decision_engine.py` to
  match the flow-graph component name. Import updated in `tasks.py`. No logic
  change.
- **Gateway response shape**: `POST /videos` now returns
  `{"status": "processing", "task_id": "<uuid>"}` instead of
  `{"job_id": "<uuid>"}`, matching the flow graph's instant-acknowledgment
  contract.
- **Stage C cleanup**: `tasks.py` now calls `storage.cleanup_video()` after
  processing completes to remove the temp file (mirrors the flow graph's
  Stage C disk cleanup, without FFmpeg).
- `requirements.txt`: `pymongo` and `minio` removed; `psycopg2-binary==2.9.10`
  added.
- `frontend/lib/api.ts`: `uploadVideo()` return type updated to
  `{task_id, status}`.
- `tests/e2e_test.py`: updated to assert `task_id` field in upload response;
  all 15 tests pass against the new stack.

## 2026-09-08 — Redactor MVP: Auth, S3, 4th Pillar, Frontend Redesign

### Auth system
- Added JWT-based authentication (`python-jose`, `passlib[bcrypt]`).
- New `users` table in PostgreSQL with `id`, `name`, `email`,
  `password_hash`, `account_type` (viewer/creator), `department`,
  `created_at`.
- Endpoints: `POST /auth/register`, `POST /auth/login`,
  `POST /auth/upgrade` (viewer → creator).
- `POST /videos` now requires a valid Creator JWT; `user_id` stored on
  each video row.
- `GET /feed` returns only approved videos (public, no auth required).

### S3 storage
- `storage.py` rewritten with `boto3`: uploads go to S3 bucket
  `amzn-s3-bucket-dvm` (us-east-2) instead of local disk.
- `config.py` reads `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_S3_BUCKET`, `AWS_S3_REGION` from `.env`.
- On EC2 with an IAM instance profile, explicit credentials are omitted
  so boto3 uses the role automatically (fixed `AWS_ERROR_INVALID_ARGUMENT`
  crash from passing empty strings).
- `docker-compose.yml` updated: PostgreSQL mapped to host port 5434
  (5433 was already taken by native Windows Postgres).

### 4th moderation pillar: filmmaking_relevance
- `backend/app/pillars/filmmaking_relevance.py`: scores 0-1; low score
  (< 0.3) means content is NOT filmmaking-related and should be blocked.
- `decision_engine.py` gains `BLOCK_BELOW_THRESHOLDS` dict for inverse
  scoring pillars (score below threshold → blocked, not above).

### Frontend redesign
- Replaced the generic dashboard with a filmmaker-focused dark-theme UI.
- Dark palette: `--bg #0a0a0f`, `--surface #13131a`, `--accent #4169e1`
  (selenium blue), all via CSS custom properties for easy theming.
- Collapsed vertical sidebar (icons only, labels on hover) using Tailwind
  `group`/`transition`; hides itself when not logged in.
- 4 pages: `/` (auth — login/register), `/feed` (approved videos),
  `/upload` (creator-only drop zone + live poll), `/profile` (user card,
  upgrade form, logout).
- `frontend/lib/auth.ts`: localStorage JWT helpers (`getToken`, `setAuth`,
  `clearAuth`, `isCreator`, etc.).
- `frontend/lib/api.ts`: typed API client extended with `register`,
  `login`, `upgradeToCreator`, `getFeed`.
- `NEXT_PUBLIC_API_URL` env var added; falls back to `localhost:8088` for
  local dev.

## 2026-09-10 — Editor Club Social Features

### Creator profile page
- New route `/creators/[id]` with avatar, stat tiles (followers, videos,
  credits), Enroute/Deroute button, and bio generated from department.
- Creator names in the feed overlay and search results are now clickable
  links navigating to the profile page.

### Persistent comments
- `comments` table in PostgreSQL: `id UUID`, `video_id TEXT`,
  `user_id UUID`, `body TEXT`, `created_at TIMESTAMPTZ`.
- `GET /videos/{job_id}/comments` and `POST /videos/{job_id}/comments`
  endpoints (token passed as query param so no CORS preflight on reads).
- `CommentDrawer` in the feed now fetches real comments on open and posts
  new ones; shows author initials + name from `users` JOIN.
- `_ensure_schema()` updated to create the comments table on startup.

### NavBar + branding
- Logout button removed from sidebar entirely — lives only on `/profile`.
- Profile icon moved to the pinned bottom slot (where logout was).
- Clapperboard icon replaced with "Editor Club" text / "EC" monogram
  (collapsed state shows initials, hover shows full name).

## 2026-09-09 — AWS Deployment (EC2 + RDS + ElastiCache + S3)

### Infrastructure
- `infra/cloudformation.yml`: full AWS stack — VPC, public + private
  subnets, Internet Gateway, route table, security groups (EC2/RDS/Redis),
  RDS PostgreSQL 15.19 (db.t3.micro), ElastiCache Redis (cache.t3.micro),
  EC2 t3.small (Amazon Linux 2023, `ami-0619724297c6fa28d`, us-east-2),
  IAM role with `AmazonSSMManagedInstanceCore` + S3 access policy,
  EC2 instance profile.
- EC2 public IP: `18.216.199.64`; API accessible at
  `http://18.216.199.64:8088`.
- RDS endpoint: `redactor-db.c1qooqeoynjz.us-east-2.rds.amazonaws.com`
- ElastiCache endpoint: `redactor-redis.5v2cub.0001.use2.cache.amazonaws.com`
- Security group `EC2SG` allows inbound TCP 8088 from `0.0.0.0/0`.

### Deployment process (manual, first deploy)
- EC2 bootstrapped via Session Manager (SSM) — no SSH keys needed.
- Repo cloned with `sudo git clone` (root ownership); `git pull` requires
  `sudo git -C /app pull` due to ownership mismatch.
- Python packages installed to `ssm-user`'s local site-packages
  (`/home/ssm-user/.local/lib/python3.9/`) — no venv possible in `/app`
  (root-owned).
- Systemd services `redactor-api.service` and `redactor-celery.service`
  created manually (UserData bootstrap runs as root at first boot but
  packages weren't available then); services run as `ssm-user`.
- `ALTER TABLE videos ADD COLUMN IF NOT EXISTS user_id UUID ...` run
  manually to migrate existing RDS table.

### Deviations / workarounds
- University network blocks non-standard ports outbound; home WiFi required
  for testing on port 8088.
- EC2 CloudFormation UserData bootstrap installs packages but the venv
  path (`/app/backend/.venv`) is wrong since `/app` is root-owned.
  Services point to `/usr/bin/python3` (system Python) instead.
- `frontend/.env.local` sets `NEXT_PUBLIC_API_URL=http://18.216.199.64:8088`
  for local frontend dev against the live AWS API.

### End-to-end verified on AWS
- Register → Login → Upgrade to Creator → Upload video → S3 storage →
  Celery moderation (4 pillars) → Decision engine → RDS result →
  Status poll returns full pillar breakdown with verdict.
