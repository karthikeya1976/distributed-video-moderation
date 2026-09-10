# Project Status — Editor Club

## Phase 0: Environment Setup ✅
- [x] Python 3.11+ installed and verified (3.12.10)
- [x] Node.js / npm verified (v24.15.0 / 11.12.1)
- [x] Docker / docker compose verified
- [x] Project repo initialized with docs scaffold

## Milestone 1–3: Pipeline, Moderation, Dashboard ✅
- [x] FastAPI gateway with upload + status endpoints
- [x] Celery + Redis async task queue
- [x] Four moderation pillars (adult content, AI/deepfake, duplicate, filmmaking relevance)
- [x] Decision engine: approved / flagged / blocked
- [x] PostgreSQL for job persistence

## Milestone 4: v2 Architecture ✅
- [x] PostgreSQL replaces MongoDB; S3 replaces local disk
- [x] `decision_engine.py` (renamed from `aggregator.py`)
- [x] E2E tests updated and passing

## Redactor MVP (2026-09-08) ✅
- [x] JWT auth: register, login, upgrade viewer → creator
- [x] `users` table with `account_type`, `department`, `credits`
- [x] Creator-gated upload (`POST /videos` requires Creator JWT)
- [x] S3 video storage via boto3 + IAM instance profile
- [x] Real moderation APIs: Sightengine (nudity + deepfake), AWS Rekognition (filmmaking relevance)
- [x] SHA-256 duplicate detection pillar
- [x] Dark-theme frontend redesign (selenium blue, `#0a0a0f` bg)
- [x] Collapsible vertical sidebar

## AWS Deployment (2026-09-09) ✅
- [x] CloudFormation stack: VPC, subnets, IGW, security groups
- [x] RDS PostgreSQL 15 (db.t3.micro)
- [x] ElastiCache Redis (cache.t3.micro)
- [x] EC2 t3.small (Amazon Linux 2023)
- [x] Nginx + Let's Encrypt TLS via DuckDNS (`redactor-api.duckdns.org`)
- [x] Systemd services: `redactor-api` + `redactor-celery` (auto-restart)
- [x] Frontend deployed to Vercel (`https://distributed-video-moderation.vercel.app`)
- [x] End-to-end verified: register → login → upload → S3 → Celery → RDS → feed

## Editor Club — Social Features (2026-09-10) ✅

### Feed
- [x] Smart feed algorithm: `{enrouted, recommended}` buckets
  - Enrouted = videos from followed creators, ordered by recency
  - Recommended = all others, ordered by `creator.credits DESC, created_at DESC`
- [x] Section dividers in feed (`Following` / `Recommended`)
- [x] Swipe navigation: drag up/down on the reel card (mouse + touch); tap to pause
- [x] Arrow keys still work alongside swipe
- [x] S3 presigned URLs for in-browser video streaming

### Upload
- [x] Format toggle: **Scene** (landscape 16:9) vs **Shot** (portrait 9:16)
- [x] Drop zone shape matches selected format aspect ratio
- [x] Moderation result shown inline after upload (pillar score bars + reasons)

### Credits
- [x] `users.credits` integer column (incremented per-video by any viewer)
- [x] `POST /videos/{id}/credit` endpoint
- [x] Star button in feed with live count display

### Follow / Enroute
- [x] `follows` table: `(follower_id, following_id)` primary key
- [x] `POST /creators/{id}/follow` and `DELETE /creators/{id}/follow`
- [x] Enroute/Deroute button in feed overlay (creator info bar)
- [x] Enroute/Deroute button on creator profile page
- [x] Enroute/Deroute button in search results

### Comments
- [x] `comments` table: `(id, video_id, user_id, body, created_at)`
- [x] `GET /videos/{id}/comments` and `POST /videos/{id}/comments`
- [x] Comment drawer in feed: fetches on open, posts with author attribution
- [x] Author name + initials shown per comment

### Search
- [x] `GET /search?q=` — ILIKE across creator names, departments, video filenames
- [x] Debounced search (400ms) via `useEffect` + `useRef` timer
- [x] Error state (API unreachable), no-results state, animated loading dots
- [x] Clear button (×) in search input
- [x] Creator results: clickable name → profile, Enroute/Deroute button
- [x] Video results: filename, creator, moderation status chip

### Creator Profile
- [x] `/creators/[id]` page: avatar (initials), name, department, CREATOR chip
- [x] Stat tiles: follower count, video count, credits
- [x] Enroute/Deroute with optimistic update + revert on error
- [x] Back button

### NavBar / Branding
- [x] Logo: "EC" collapsed → "Editor Club" expanded (with home link)
- [x] Nav items: Home (`/feed`), Search (`/search`), Upload (`/upload`, creator only)
- [x] Profile pinned to bottom slot; logout only on `/profile`

### Bug Fixes
- [x] Same-origin proxy (`next.config.ts`) eliminates mixed-content HTTPS→HTTP block
- [x] `isDivider(undefined)` crash at Next.js build time fixed (null guard)
- [x] `videos.user_id::uuid` JOIN cast fixed (EC2 schema has UUID type, not TEXT)
- [x] `_CREATE_COMMENTS_TABLE` split into two separate `execute()` calls (psycopg2 single-statement limit)

## Pending / Future
- [ ] Creator profile: list their approved videos inline
- [ ] Notifications for new followers and credits received
- [ ] Saved videos (bookmark persisted to DB, not just local state)
- [ ] CloudFormation UserData fully automated (no manual `pip install` step)
- [ ] Remove `/debug/feed` and `/debug/search` endpoints before public launch
