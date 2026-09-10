# Redactor

**A filmmaker discovery platform with AI-powered video moderation.**

Creators upload showreels; the platform runs them through a distributed moderation pipeline (nudity detection, AI/deepfake detection, duplicate check, filmmaking relevance) before they appear in the public feed.

🌐 **Live**: https://distributed-video-moderation.vercel.app  
🔌 **API**: https://redactor-api.duckdns.org

---

## Architecture

```
[Next.js Frontend — Vercel]
        │  HTTPS POST (video file)
        ▼
[FastAPI Gateway — EC2 :8088]
        │  save to S3 → instant ack {task_id}
        ▼
[ElastiCache Redis]  ← task queue
        │
        ▼
[Celery Worker — EC2]
   │         │           │            │
   ▼         ▼           ▼            ▼
Adult     AI/Deepfake  Duplicate   Filmmaking
Content   (Sightengine) Content    Relevance
(Sightengine)         (SHA-256    (AWS Rekognition)
                       S3 hash)
   │         │           │            │
   └─────────┴───────────┴────────────┘
                         │
                  [Decision Engine]
               approved / flagged / blocked
                         │
                         ▼
              [RDS PostgreSQL — AWS]
                         │
                         ▼
         [FastAPI /feed & /status endpoints]
                         │
                         ▼
         [Next.js Feed — TikTok-style reel player]
```

### Key design decisions
- **Pillars are swappable**: each exposes `async def check(job_id) -> dict` — mock vs real API is one file change
- **S3 objects are kept** after processing so the feed can stream via presigned URLs
- **Duplicate detection** uses SHA-256 hash — unique content per creator, zero API cost
- **Filmmaking relevance uses inverse scoring** — low score = not filmmaking content = blocked
- **No scores in the feed** — clean viewer UX; scores only shown at upload time

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS (dark theme, selenium blue) |
| API Gateway | FastAPI + Uvicorn |
| Task Queue | Celery + Redis (ElastiCache) |
| Storage | AWS S3 (video files + frame extraction) |
| Database | PostgreSQL 15 (RDS) |
| Moderation | Sightengine (nudity + deepfake), AWS Rekognition (scene labels) |
| Infra | AWS EC2 t3.small, CloudFormation, Nginx, Let's Encrypt |
| Auth | JWT (`python-jose`), bcrypt (`passlib`) |

---

## Moderation Pillars

| Pillar | API | Threshold | Action |
|--------|-----|-----------|--------|
| `adult_content` | Sightengine nudity-2.1 | score ≥ 0.8 → blocked, ≥ 0.5 → flagged | Only explicit nudity (not romance) |
| `ai_deepfake` | Sightengine genai | score ≥ 0.7 → flagged | AI-generated / synthetic media |
| `duplicate_content` | SHA-256 S3 hash | score = 1.0 → blocked | Same file already on platform |
| `filmmaking_relevance` | AWS Rekognition DetectLabels | score < 0.3 → blocked | Off-topic content removed |

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Liveness check |
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Get JWT token |
| POST | `/auth/upgrade` | JWT | Upgrade viewer → creator |
| POST | `/videos` | JWT (creator) | Upload video for moderation |
| GET | `/videos/{job_id}/status` | — | Poll moderation result |
| GET | `/feed` | — | Approved + flagged videos (public) |

### Upload response
```json
{ "status": "processing", "task_id": "uuid" }
```

### Status response (after processing)
```json
{
  "job_id": "uuid",
  "filename": "showreel.mp4",
  "status": "done",
  "overall_status": "approved",
  "reasons": [],
  "pillars": [
    { "pillar": "adult_content",       "score": 0.02, "flags": [] },
    { "pillar": "ai_deepfake",         "score": 0.11, "flags": [] },
    { "pillar": "duplicate_content",   "score": 0.0,  "flags": [] },
    { "pillar": "filmmaking_relevance","score": 0.5,  "flags": [] }
  ],
  "video_url": "https://s3.amazonaws.com/...",
  "creator_name": "Karthikeya",
  "creator_department": "Cinematography"
}
```

---

## Local Development

### Prerequisites
- Python 3.9+, Node.js 18+, Docker

### 1. Start local infrastructure
```bash
docker compose up -d   # Redis + PostgreSQL
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in: POSTGRES_URL, REDIS_URL, AWS_S3_BUCKET, AWS_S3_REGION,
#          AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
#          SIGHTENGINE_USER, SIGHTENGINE_SECRET, JWT_SECRET
```

### 3. Start the API
```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8088
```

### 4. Start a Celery worker
```bash
cd backend
python -m celery -A app.tasks worker --loglevel=info --pool=solo
```

### 5. Start the frontend
```bash
cd frontend
# Create frontend/.env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8088
npm install && npm run dev
```

Open **http://localhost:3000**

---

## AWS Deployment

Infrastructure is defined in `infra/cloudformation.yml`:

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation.yml \
  --stack-name redactor-v2 \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      DBPassword=<password> \
      JWTSecret=<secret> \
      S3Bucket=<bucket-name>
```

EC2 runs systemd services `redactor-api` and `redactor-celery` (auto-restart on crash, enabled on boot).

---

## Interview Cheat Sheet

| Question | Answer |
|----------|--------|
| **What does this do?** | Filmmakers upload showreels; a distributed pipeline checks for nudity, AI-generated content, duplicates, and filmmaking relevance before the video appears in a TikTok-style reel feed. |
| **Why FastAPI + Celery?** | FastAPI returns an instant acknowledgment (`task_id`) while Celery processes the video asynchronously. The upload endpoint never blocks — it drops a job on the Redis queue and returns immediately. |
| **Why Redis?** | Acts as the Celery message broker and result backend. Decouples the API from the workers — you can scale workers horizontally without touching the API. |
| **Why S3?** | Videos persist beyond the EC2 instance and are streamed directly to the browser via time-limited presigned URLs — EC2 never proxies video bytes. |
| **How does frame extraction work?** | OpenCV (`cv2`) downloads the video from S3 to a temp file, extracts 5 evenly-spaced frames as JPEGs, uploads them to S3 with presigned URLs, and sends those URLs to Sightengine/Rekognition. Temp frames are deleted after checking. |
| **How does duplicate detection work?** | SHA-256 hash of the full video file is computed on upload and stored in PostgreSQL. If another row has the same hash, the video is flagged as duplicate. Zero API cost, exact-match only. |
| **How does filmmaking relevance work?** | AWS Rekognition `DetectLabels` on a mid-video frame returns scene labels. Labels matching a filmmaking/creative vocabulary (camera, person, performance, landscape, etc.) increase the score. Score < 0.3 → blocked. |
| **Why inverse scoring for filmmaking?** | Most pillars block high scores (more harm = higher score). Relevance is the opposite — a low score means off-topic content. `BLOCK_BELOW_THRESHOLDS` in the decision engine handles this case separately. |
| **What's the auth model?** | JWT tokens signed with HS256. Two account types: `viewer` (can browse feed) and `creator` (can upload). Viewers self-upgrade by selecting their filmmaking department. |
| **What would you change for production?** | Add webhook callbacks so workers push results instead of polling; add rate limiting and dead-letter queues; use CloudFront in front of S3 for CDN-cached video delivery; add frame-level audio analysis for better deepfake detection. |

---

## Project Docs
- `docs/project_spec.md` — product spec and roadmap  
- `docs/architecture.md` — system design and component breakdown  
- `docs/moderation_policies.md` — per-pillar thresholds and aggregation rules  
- `docs/project_status.md` — milestone tracker  
- `docs/changelog.md` — implementation history  
