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
