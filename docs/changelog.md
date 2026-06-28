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
