# Distributed Video Moderation Platform

A locally-runnable, mocked version of a distributed video moderation
pipeline: FastAPI + Celery + Redis + MinIO + MongoDB backend, Next.js
dashboard frontend.

## Area 1: Project Goals

- Build, from scratch, a working version of the "Distributed Video
  Moderation System" described on the user's resume, so it can be
  confidently explained and demoed end-to-end.
- Keep everything free and runnable locally: no paid third-party APIs or
  cloud accounts required. Real services (Sightengine, Pex, AWS Rekognition)
  are represented as pluggable mock "pillar" modules that can be swapped for
  real API clients later without changing the architecture.
- Beginner-friendly: explain Python/FastAPI/Celery/Docker/Next.js concepts
  as they're introduced, since the user is new to building this kind of
  system.
- Preserve the "multi-pillar" framing from the original briefing (Adult
  Content, AI/Deepfake, Copyright) and the distributed/async/scalable story
  (Redis queue, Celery workers, horizontal scaling).

## Area 2: Architecture Overview

```
[Next.js Frontend] --(upload)--> [FastAPI Backend] --> [MinIO (S3-compatible, local)]
                                        |
                                        v
                              [Redis Queue] --(Celery tasks)--> [Worker(s)]
                                                                     |
                                              +----------------------+----------------------+
                                              v                      v                      v
                                    [Mock Adult Content]   [Mock AI/Deepfake]      [Mock Copyright/Pex]
                                              |                      |                      |
                                              +----------------------+----------------------+
                                                                     v
                                                          [Aggregator: combine scores
                                                           -> approved/flagged/blocked]
                                                                     v
                                                          [MongoDB: store job + result]
                                                                     v
                                              [FastAPI status endpoint] --> [Next.js dashboard polls/displays]
```

- **Backend** (`backend/app/`): FastAPI app (`main.py`), Celery tasks
  (`tasks.py`), storage helpers (`storage.py` for MinIO), DB helpers
  (`db.py` for MongoDB job documents), config (`config.py`), pillar modules
  (`pillars/`), and the verdict aggregator (`aggregator.py`).
- **Frontend** (`frontend/`, Milestone 3): Next.js + Tailwind + shadcn/ui
  dashboard for uploading videos and viewing moderation results.
- **Infra**: `docker-compose.yml` runs Redis, MinIO, and MongoDB.
- Full design rationale and data flow: `docs/architecture.md`.
- Detailed scoring thresholds and aggregation rules:
  `docs/moderation_policies.md`.

## Area 3: Design Style Guide

- Python: keep modules small and single-purpose (one concern per file —
  storage, db, config, each pillar, aggregator). Favor plain functions over
  classes unless state genuinely needs to be encapsulated.
- Each "pillar" module exposes the same async interface:
  `async def check(job_id: str) -> dict` returning
  `{"pillar": str, "score": float 0-1, "flags": [...]}` — this is what makes
  pillars swappable (mock <-> real API) without touching the orchestration
  code.
- No premature abstraction: don't add config flags, retries, or error
  handling for cases that can't currently happen. Add them when a real
  integration needs them.
- Frontend: Next.js App Router, Tailwind CSS, shadcn/ui components. Explain
  React/Next.js concepts inline as they're introduced (this is new territory
  for the user).
- Comments only where the *why* isn't obvious from the code (e.g., why a
  mock derives scores from a hash, why a port differs from the plan).

## Area 4: Constraints & Policies

- **No paid APIs / cloud accounts.** All three moderation pillars
  (adult content, AI/deepfake, copyright) are mocked locally — see
  `docs/moderation_policies.md` for thresholds.
- **Local-only infra**: MinIO stands in for S3/R2, local MongoDB (via
  Docker) stands in for MongoDB Atlas/Supabase.
- **Docker network limitation**: this machine's Docker cannot reach
  pypi.org during image builds (SSL interception, likely VPN/AV). Therefore:
  - Redis, MinIO, MongoDB run via `docker compose` (prebuilt images, no pip
    install needed).
  - The FastAPI app and Celery worker run directly on Windows via a local
    Python venv (`backend/venv`).
  - Revisit containerizing the backend if/when the network issue is
    resolved.
- **Port assignments** (chosen to avoid conflicts with other running
  containers/services on this machine):
  - FastAPI API: **8088** (8080 was already in use)
  - Redis: host **6380** -> container 6379
  - MongoDB: host **27018** -> container 27017 (container name
    `video-mod-mongo`, distinct from any pre-existing `mongo:6` container)
  - MinIO: **9000** (API), **9001** (console)

## Area 5: Repository Etiquette

- Branch per milestone: `milestone-N-<short-name>`, merged into `main` once
  that milestone's "Definition of Done" passes.
- Commit at the end of each completed milestone (not mid-milestone), with a
  message summarizing what was added.
- `.gitignore` excludes `backend/venv/`, `node_modules/`, `.next/`,
  `__pycache__/`, `uploads/`, `frames/`, `.env*`.
- Update `docs/project_status.md` and `docs/changelog.md` as part of each
  milestone's commit — don't let them drift from what's actually built.

## Area 6: Documentation

- `docs/project_spec.md` — the product specification: problem statement,
  core features, and version roadmap (MVP/v1/v2/Later/Not in Scope), plus a
  mapping table showing how each spec item maps to what's actually built in
  this repo (mocked/local vs. real).
- `docs/architecture.md` — system design, component breakdown, data flow
  diagram, job document schema, and the local development topology
  (expanded version of Area 2).
- `docs/project_status.md` — checklist tracker of milestones/tasks. Use this
  to pick up where the project left off — it reflects the true current state.
- `docs/changelog.md` — dated entries describing what was implemented at
  each step, including any deviations from the original plan (e.g., the
  Docker workaround in Area 4) and why.
- `docs/moderation_policies.md` — per-pillar score thresholds and the
  aggregation rules that turn pillar scores into an overall
  approved/flagged/blocked verdict.
- Root `README.md` (added in Milestone 3) — setup/run instructions and an
  "how to explain this project" cheat sheet for interviews.

### Documentation update rule

At the end of **every milestone, and after any major decision or deviation**
(e.g., a scope change, a workaround like the Docker network issue, a new
constraint), update:
1. `docs/changelog.md` — append a dated entry describing what changed and why
2. `docs/project_status.md` — check off completed items / add new ones
3. `docs/architecture.md` and/or `docs/moderation_policies.md` — if the
   design, data flow, schema, or thresholds changed
4. `docs/project_spec.md` — if scope, roadmap, or the spec-to-build mapping
   changed

Treat stale docs as a bug: if the docs don't match the code, fix the docs
before moving to the next milestone.
