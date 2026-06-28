"""
End-to-end tests for the Distributed Video Moderation Platform.
Uses only Python stdlib (urllib) — no extra pip installs required.

Run with:
  cd backend && venv/Scripts/python ../tests/e2e_test.py
"""

import json
import time
import urllib.request
import urllib.error
import uuid
import sys

BASE = "http://localhost:8088"
POLL_TIMEOUT = 15
POLL_INTERVAL = 0.5

GREEN = "\033[32m"
RED   = "\033[31m"
RESET = "\033[0m"

# Ordered registry of (label, fn) tuples
_TESTS: list[tuple[str, object]] = []


# ── Helpers ───────────────────────────────────────────────────────────────────

def register(label: str):
    """Decorator that registers a test function."""
    def decorator(fn):
        _TESTS.append((label, fn))
        return fn
    return decorator


def get(path: str) -> tuple[int, dict]:
    try:
        with urllib.request.urlopen(f"{BASE}{path}") as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, {}


def options_req(path: str, origin: str) -> dict:
    req = urllib.request.Request(
        f"{BASE}{path}",
        method="OPTIONS",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e:
        return {k.lower(): v for k, v in e.headers.items()}


def multipart_upload(filename: str, content: bytes) -> tuple[int, dict]:
    boundary = "----TestBoundary"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: video/mp4\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{BASE}/videos",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def fake_video(label: str) -> tuple[str, bytes]:
    name = f"{label}.mp4"
    content = (b"\x00\x01\x02\x03" * 12800)[:50000]
    return name, content


def wait_for_done(job_id: str) -> dict:
    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        _, data = get(f"/videos/{job_id}/status")
        if data.get("status") == "done":
            return data
        time.sleep(POLL_INTERVAL)
    raise TimeoutError(f"Job {job_id} not done within {POLL_TIMEOUT}s")


def upload_and_wait(label: str) -> dict:
    name, content = fake_video(label)
    code, body = multipart_upload(name, content)
    assert code == 200, f"Upload failed: {code} — {body}"
    # POST /videos now returns {status, task_id} per the flow-graph spec
    task_id = body.get("task_id") or body.get("job_id")
    return wait_for_done(task_id)


# ── Test definitions ──────────────────────────────────────────────────────────

@register("Health endpoint returns {status: ok}")
def test_health():
    code, body = get("/health")
    assert code == 200, f"Expected 200, got {code}"
    assert body == {"status": "ok"}, f"Body: {body}"


@register("Upload returns {status: processing, task_id: <uuid>}")
def test_upload_returns_task_id():
    name, content = fake_video("upload_test")
    code, body = multipart_upload(name, content)
    assert code == 200, f"Upload returned {code}: {body}"
    assert body.get("status") == "processing", f"Expected status=processing, got: {body}"
    assert "task_id" in body, f"No task_id in: {body}"
    uuid.UUID(body["task_id"])  # raises ValueError if not a valid UUID


@register("Uploaded job is visible in status endpoint immediately")
def test_job_visible_after_upload():
    name, content = fake_video("visibility_test")
    _, body = multipart_upload(name, content)
    task_id = body["task_id"]
    code, data = get(f"/videos/{task_id}/status")
    assert code == 200, f"Status returned {code}"
    assert data["status"] in ("pending", "processing", "done")
    assert data["job_id"] == task_id


@register("Job reaches 'done' status within 15s")
def test_job_completes():
    result = upload_and_wait("done_test")
    assert result["status"] == "done"


@register("Done job has overall_status (approved / flagged / blocked)")
def test_overall_status():
    result = upload_and_wait("verdict_test")
    assert result["overall_status"] in ("approved", "flagged", "blocked"), \
        f"Got: {result.get('overall_status')}"


@register("Done job has exactly 3 pillars")
def test_three_pillars():
    result = upload_and_wait("pillars_test")
    pillars = result.get("pillars", [])
    assert len(pillars) == 3, f"Expected 3, got {len(pillars)}: {pillars}"
    names = {p["pillar"] for p in pillars}
    assert names == {"adult_content", "ai_deepfake", "copyright_match"}, \
        f"Unexpected names: {names}"


@register("All pillar scores are floats in [0.0, 1.0]")
def test_pillar_scores():
    result = upload_and_wait("scores_test")
    for p in result["pillars"]:
        s = p["score"]
        assert isinstance(s, (int, float)), f"Score not numeric: {s}"
        assert 0.0 <= s <= 1.0, f"Score out of range: {s}"
        assert isinstance(p["flags"], list), "flags not a list"


@register("Done job has 'reasons' list")
def test_reasons():
    result = upload_and_wait("reasons_test")
    assert "reasons" in result
    assert isinstance(result["reasons"], list)


@register("Done job has all required fields")
def test_required_fields():
    result = upload_and_wait("fields_test")
    required = ("job_id","filename","status","overall_status",
                 "pillars","reasons","created_at","updated_at")
    for f in required:
        assert f in result, f"Missing field: {f}"


@register("Unknown job_id returns 404")
def test_404():
    code, _ = get("/videos/nonexistent-id/status")
    assert code == 404, f"Expected 404, got {code}"


@register("GET /videos returns a non-empty list")
def test_list_endpoint():
    upload_and_wait("list_test")  # ensure at least one completed job exists
    code, body = get("/videos")
    assert code == 200
    assert isinstance(body, list), f"Expected list, got {type(body)}"
    assert len(body) > 0, "List is empty"


@register("GET /videos?limit=2 returns at most 2 items")
def test_list_limit():
    code, body = get("/videos?limit=2")
    assert code == 200
    assert len(body) <= 2, f"Expected <=2, got {len(body)}"


@register("List items have job_id, status, filename")
def test_list_fields():
    _, body = get("/videos")
    job = body[0]
    for field in ("job_id", "status", "filename"):
        assert field in job, f"Missing '{field}' in list item"


@register("CORS allows http://localhost:3000")
def test_cors():
    headers = options_req("/videos", "http://localhost:3000")
    assert "access-control-allow-origin" in headers, \
        f"No CORS header. Got: {list(headers.keys())}"
    assert headers["access-control-allow-origin"] == "http://localhost:3000"


@register("All three verdicts (approved, flagged, blocked) are reachable")
def test_verdict_coverage():
    seen = set()
    for i in range(12):
        n, c = fake_video(f"coverage_{i}")
        _, body = multipart_upload(n, c)
        task_id = body["task_id"]
        result = wait_for_done(task_id)
        seen.add(result["overall_status"])
        if seen == {"approved", "flagged", "blocked"}:
            break
    for v in ("approved", "flagged", "blocked"):
        assert v in seen, f"'{v}' verdict never seen. Got: {seen}"


# ── Runner ────────────────────────────────────────────────────────────────────

def run():
    print(f"\n{'='*58}")
    print("  Distributed Video Moderation — E2E Test Suite")
    print(f"  Target: {BASE}")
    print(f"  Tests:  {len(_TESTS)}")
    print(f"{'='*58}\n")

    failures = []
    for label, fn in _TESTS:
        try:
            fn()
            print(f"  {GREEN}PASS{RESET}  {label}")
        except Exception as e:
            print(f"  {RED}FAIL{RESET}  {label}")
            print(f"         {e}")
            failures.append((label, e))

    passed = len(_TESTS) - len(failures)
    print(f"\n{'='*58}")
    if not failures:
        print(f"  {GREEN}ALL {len(_TESTS)} TESTS PASSED{RESET}")
    else:
        print(f"  {passed}/{len(_TESTS)} passed — {RED}{len(failures)} FAILED{RESET}")
        for label, err in failures:
            print(f"    • {label}: {err}")
    print(f"{'='*58}\n")
    return len(failures)


if __name__ == "__main__":
    sys.exit(run())
