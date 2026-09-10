#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/verify_artifacts.py — CI artifact-integrity gate.

Confirms the Next.js production build actually produced a working server
bundle for every route the app declares, and that nothing came out empty
or truncated. This does NOT re-check business logic (that's the regression
test job) — it only catches a broken/partial/corrupted build.

Usage:
  python scripts/verify_artifacts.py --dir frontend/.next

Exit code 0 = clean build, 1 = problems found (prints details to stdout).
"""
import sys
import json
import argparse
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="Path to the .next build output")
    args = ap.parse_args()

    build_dir = Path(args.dir)
    errors: list[str] = []

    if not build_dir.exists():
        print(f"BUILD OUTPUT MISSING: {build_dir} does not exist (did the build step run?)")
        return 1

    # 1. Core build metadata must exist
    required_meta = ["BUILD_ID", "app-path-routes-manifest.json", "routes-manifest.json"]
    for name in required_meta:
        p = build_dir / name
        if not p.exists():
            errors.append(f"MISSING build metadata: {name}")
        elif p.stat().st_size == 0:
            errors.append(f"EMPTY (corrupted) build metadata: {name}")

    if errors:
        # Can't reliably check routes below without the manifest — report and stop here
        print("ARTIFACT SCAN FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1

    # 2. Every declared app route must have produced a server bundle file.
    #    We read the manifest Next.js itself generates rather than hardcoding
    #    page names, so this doesn't go stale when pages are added/removed.
    #    Layout on disk (Turbopack): route key "/feed/page" -> bundle file
    #    "server/app/feed/page.js" (sibling to, not inside, the "page/" metadata folder).
    manifest = json.loads((build_dir / "app-path-routes-manifest.json").read_text())
    server_app_dir = build_dir / "server" / "app"

    if not server_app_dir.exists():
        errors.append("MISSING server/app directory entirely — build did not emit server bundles")
    else:
        for route_key in manifest:
            # route_key looks like "/feed/page" or "/creators/[id]/page" or "/favicon.ico/route"
            rel_path = route_key.lstrip("/")
            bundle_file = server_app_dir / f"{rel_path}.js"
            if not bundle_file.exists():
                errors.append(f"MISSING server bundle for route {manifest[route_key]}: expected {bundle_file.relative_to(build_dir)}")
            elif bundle_file.stat().st_size == 0:
                errors.append(f"CORRUPTED server bundle for route {manifest[route_key]}: {bundle_file.relative_to(build_dir)} is 0 bytes")

    # 3. Static asset directory should exist and be non-trivial in size
    static_dir = build_dir / "static"
    if not static_dir.exists():
        errors.append("MISSING static/ directory — client-side JS/CSS was not emitted")
    else:
        total_size = sum(f.stat().st_size for f in static_dir.rglob("*") if f.is_file())
        if total_size == 0:
            errors.append("static/ directory exists but is completely empty")

    if errors:
        print("ARTIFACT SCAN FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1

    route_count = len(manifest)
    print(f"Artifact scan passed — {route_count} route(s) verified, static assets present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
