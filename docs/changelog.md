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
