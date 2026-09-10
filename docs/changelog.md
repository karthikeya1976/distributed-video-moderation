# Changelog

## 2026-06-14
- Project initialized: repo, docs scaffold, `.gitignore`, `CLAUDE.md`.

## 2026-06-15
- **Milestone 1**: FastAPI gateway (`/health`, `POST /videos`, `GET /videos/{id}/status`), MinIO storage, MongoDB job docs, Celery task `process_video`. Infra via docker-compose. Verified end-to-end: pending → processing → received.
- **Milestone 2**: Three mock moderation pillars (`adult_content`, `ai_deepfake`, `copyright_match`) with deterministic pseudo-random scores via `common.py`. `aggregator.py` combines scores into approved/flagged/blocked. Pillars run concurrently via `asyncio.gather`.

## 2026-06-17
- **Milestone 3**: `GET /videos` list endpoint + CORS. Next.js 16 frontend: upload page (`/`), moderation dashboard (`/dashboard`) with 3-second polling, per-job expandable detail rows, pillar score bars, flag timelines, verdict badges.

## 2026-06-28 — v2 Architecture Upgrade
- **PostgreSQL** replaces MongoDB (`psycopg2-binary`; `videos` table with JSONB columns).
- **Temp disk** replaces MinIO (`UPLOAD_DIR = C:/tmp/video_uploads/`).
- `aggregator.py` → `decision_engine.py` (rename, no logic change).
- `POST /videos` now returns `{status, task_id}` (instant ack).
- `tasks.py` calls `storage.cleanup_video()` after processing.
- E2E tests updated; all 15 pass against new stack.

## 2026-09-08 — Redactor MVP
- **JWT auth**: `POST /auth/register`, `/auth/login`, `/auth/upgrade`. `python-jose` + `passlib[bcrypt]`. `users` table added to PostgreSQL.
- **Creator-gated upload**: `POST /videos` requires Creator JWT; `user_id` stored on video rows.
- **S3 storage**: `storage.py` rewritten with `boto3`; `amzn-s3-bucket-dvm` (us-east-2). IAM instance profile support on EC2.
- **4th pillar** `filmmaking_relevance`: AWS Rekognition `DetectLabels`; inverse scoring — score < 0.3 → blocked. `BLOCK_BELOW_THRESHOLDS` added to `decision_engine.py`.
- **Real moderation APIs**: Sightengine nudity-2.1 (adult content), Sightengine genai (deepfake), SHA-256 hash (duplicate detection), AWS Rekognition (filmmaking).
- **Frontend redesign**: dark theme (`#0a0a0f` bg, `#4169e1` selenium blue), collapsible sidebar (icons → labels on hover), 4 pages: `/` auth, `/feed`, `/upload`, `/profile`.

## 2026-09-09 — AWS Deployment
- **CloudFormation** `infra/cloudformation.yml`: VPC, subnets, IGW, security groups, RDS PostgreSQL 15 (db.t3.micro), ElastiCache Redis (cache.t3.micro), EC2 t3.small (Amazon Linux 2023), IAM role + instance profile.
- **Nginx + Let's Encrypt** via DuckDNS: `https://redactor-api.duckdns.org` terminates TLS, proxies to `:8088`.
- **Systemd services**: `redactor-api` and `redactor-celery` auto-restart and survive reboots.
- **Vercel deploy**: frontend at `https://distributed-video-moderation.vercel.app`.
- End-to-end verified on AWS: register → login → upgrade → upload → S3 → Celery → 4 pillars → RDS → presigned URL feed.

## 2026-09-10 — Editor Club Social Features

### Smart feed
- `GET /feed` now accepts optional `?token=<jwt>` and returns `{enrouted, recommended}` instead of a flat list.
- Two SQL queries: (1) videos from followed creators, recency-ordered; (2) all others, ranked by `creator.credits DESC, created_at DESC`.
- Frontend merges buckets with `SectionDivider` entries (`Following` / `Recommended`). `isDivider()` guards against `undefined` at Next.js build time (prerender crash fix).

### Follow / Enroute system
- `follows` table added: `(follower_id UUID, following_id UUID, created_at)` with composite PK.
- `POST /creators/{id}/follow` and `DELETE /creators/{id}/follow` endpoints.
- Enroute/Deroute pill in feed overlay, creator profile page, and search results. Optimistic update with revert on error.

### Credits
- `users.credits INTEGER DEFAULT 0` column added.
- `POST /videos/{id}/credit` increments creator credits by 1.
- Star button in feed shows live count; one credit per viewer per session.

### Comments
- `comments` table: `(id UUID, video_id TEXT, user_id UUID, body TEXT, created_at)`.
- `GET /videos/{id}/comments` and `POST /videos/{id}/comments?token=<jwt>`.
- `CommentDrawer` in feed fetches on open, posts with author attribution; author name + initials shown per comment.
- `_ensure_schema()` fixed: `CREATE INDEX` split into a separate `execute()` call (psycopg2 only handles one statement per call).

### Search
- `GET /search?q=` ILIKE query across creator names/departments and video filenames.
- Debounced 400ms via `useEffect` + `useRef` timer (replaces broken `useCallback(debounce())` pattern).
- UX: animated 3-dot loading indicator, clear (×) button, error banner, no-results state with suggestions.

### Creator profile page
- `/creators/[id]` with avatar (initials), name, department chip, stat tiles (followers, videos, credits), Enroute/Deroute button, back button.

### Upload format toggle
- **Scene** (16:9 landscape) and **Shot** (9:16 portrait) selector above the drop zone.
- Drop zone shape changes to match the selected format's aspect ratio.
- Switching format clears the file picker. Submit button label reflects format.

### Feed swipe navigation
- `SwipeCard` component wraps the reel card: `onPointerDown`/`onPointerMove`/`onPointerUp` track drag delta.
- Swipe up = next, swipe down = prev, tap = pause/play. Works with mouse and touch.
- Removed arrow navigation buttons below the card; subtle ↑/↓ hints shown inside card edges.
- Arrow keyboard navigation (`↑↓` + `Space`) still works alongside swipe.

### NavBar
- Logo: "EC" monogram collapsed → "Editor Club" full name expanded; `<Link href="/feed">` (was dead `<div>`).
- Nav items: Home (`/feed`), Search (`/search`), Upload (`/upload`, creator only), Profile (pinned bottom).
- Logout removed from sidebar — exists only on `/profile`.

### Bug fixes
- **Mixed-content block**: added `next.config.ts` rewrite proxying `/api/backend/*` to `https://redactor-api.duckdns.org/*` at Vercel edge. All API calls use `/api/backend` base — browser never makes a cross-origin HTTPS→HTTP request.
- **EC2 JOIN crash**: `videos.user_id` is `UUID` on EC2 (unlike local `TEXT`); changed all JOINs from `v.user_id = u.id::text` to `v.user_id::uuid = u.id`.
- **Prerender crash**: `isDivider()` now accepts `FeedItem | undefined` and guards `item != null` before `"_divider" in item`.

### Cleanup
- Removed unused files: `app/dashboard/page.tsx`, `components/job-detail.tsx`, `components/jobs-table.tsx`, `components/upload-form.tsx`, `components/ui/{badge,button,card,progress}.tsx`, `lib/utils.ts`, `components.json`, `frontend/README.md`, `public/*.svg` (Next.js boilerplate assets).
- Updated `README.md`, `docs/architecture.md`, `docs/project_status.md`, `docs/changelog.md` to reflect current Editor Club state.
