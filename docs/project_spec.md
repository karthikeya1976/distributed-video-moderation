# Project Specification: Distributed Video Moderation Platform

> **Note on scope for this build:** This spec preserves the original product
> vision and roadmap as written. The implementation has evolved beyond the
> original mocked design — it now runs on **real AWS infrastructure** (EC2,
> RDS, ElastiCache, S3) with **real moderation APIs** (Sightengine, AWS
> Rekognition) and a full social layer (follows, credits, comments, search).
> See `docs/architecture.md` for the current system design and the mapping
> table below for which spec items are built vs. still pending.

## Part 1: Product Requirements (What & Why)

### 1. Overview & Problem Statement

* **Target Audience:** Content-driven platforms, forums, or applications hosting user-generated video content that need to comply with trust, safety, and legal guidelines.
* **The Problem:** Manually reviewing uploaded videos for copyright infringement, adult content, and AI deepfakes is slow, expensive, and non-scalable. Building custom AI detection models from scratch requires millions of data samples and complex infrastructure training.
* **The Solution:** An intermediate-level backend infrastructure tool that intercepts frontend video uploads, runs them through optimized third-party Model Context Protocol (MCP) servers and APIs asynchronously, aggregates the safety metrics, and executes automated policy decisions.

### 2. Core Features & User Workflows

* **Secure Direct Upload:** The frontend fetches a secure, presigned upload path from the backend, allowing users to upload video files directly to cloud object storage.
* **Asynchronous Moderation Processing:** Upon successful upload, the system automatically offloads the video processing task to a background worker queue, freeing up web server resources.
* **Parallel Multi-Pillar Safety Checks:** Worker nodes evaluate the video against three core criteria simultaneously:
  * *Adult Content:* Scanning for explicit or suggestive imagery and transcript language.
  * *AI Generation:* Identifying structural markers left by synthetic generation networks.
  * *Copyright Protection:* Digital audio/visual fingerprint matching against media rights registries.
* **Automated Status Aggregation:** A backend policy engine reads incoming multi-pillar results and marks the video state as `Approved`, `Flagged`, or `Blocked`.
* **Review Dashboard:** An admin view displaying the video registry alongside an interactive violation timeline highlighting the exact timestamps where content flags were triggered.

### 3. Roadmap

| Version | Core Capabilities & Functionality |
|---|---|
| **MVP** | Single User Upload: Frontend allows a single user to upload a video file directly to cloud storage (Cloudflare R2/S3) via a secure presigned URL.<br>Async Pipeline: Upload triggers a background job in an asynchronous queue (BullMQ/Celery) to keep the main thread unblocked.<br>Three Pillar Check: Backend workers make parallel API calls to Sightengine (Adult & Deepfakes) and Pex (Copyright) and capture the raw scores via webhooks.<br>Basic Policy Execution: Automated script flags or blocks a video if any metric crosses a hardcoded safety threshold. |
| **v1** | Moderator Dashboard: A Next.js frontend dashboard where an admin can see a list of uploaded videos and their global moderation status (Approved, Flagged, Blocked).<br>Visual Timeline Flags: Displays an interactive timeline next to flagged videos, marking the exact timestamps (e.g., `[00:01:23]`) where a violation occurred.<br>Manual Overrides: Allows a moderator to manually change a video status if an API returns a false positive or false negative. |
| **v2** | Dynamic Policy Management: Move safety thresholds from hardcoded values to a database configuration UI, allowing admins to adjust sensitivity levels on the fly.<br>Advanced Webhook Retries: Staggered retry logic and failure queues (Dead Letter Queues) to handle external moderation API downtime smoothly.<br>User Notifications: Automatically email or ping the uploading user if their video is flagged or blocked, citing the specific pillar violated. |
| **Later** | Auto-Chunking & Streaming: Slice massive video files into smaller chunks to stream them to the moderation APIs concurrently, drastically reducing processing latency.<br>Multi-Tenant Spaces: Allow different platforms or clients to create accounts, generate their own API keys, and define custom moderation profiles. |
| **Not in Scope** | Custom ML Model Training: Training custom deep learning networks from scratch for NSFW or copyright detection (relying 100% on external APIs/MCPs instead).<br>Real-Time Live Stream Moderation: Frame-by-frame interception of live video streams (MVP and initial versions will strictly focus on video-on-demand uploads). |

### 4. Current build mapping (this repo vs. spec)

| Spec item | This build |
|---|---|
| Cloud object storage (R2/S3) via presigned URL | **AWS S3** (`amzn-s3-bucket-dvm`, us-east-2); presigned URLs for in-browser streaming |
| Async queue (BullMQ/Celery) | **Celery + ElastiCache Redis** on AWS EC2 |
| Sightengine (Adult & Deepfakes), Pex (Copyright) | **Real Sightengine API** (nudity + deepfake); **SHA-256 duplicate detection** replaces copyright fingerprinting |
| Policy engine → Approved/Flagged/Blocked | **`decision_engine.py`** with 4-pillar thresholds + inverse scoring for filmmaking relevance |
| Moderator dashboard with violation timeline | Replaced by **TikTok-style reel feed** (`/feed`); pillar scores shown at upload time in result card |
| Manual overrides | Not built |
| Dynamic policy UI | Not built |
| User notifications (new followers / credits) | Not built — listed as pending in `project_status.md` |
| Advanced retries / dead-letter queues | Not built |
| Multi-tenancy | Not built |
| **Beyond spec — social layer** | **Credits** (viewers give stars to creators), **Follow/Enroute** (`follows` table, Enroute/Deroute UI), **Comments** (persisted in DB with author attribution), **Search** (debounced, creators + videos), **Creator profiles** (`/creators/[id]`), **Smart feed** (enrouted first, then recs ranked by credits) |
