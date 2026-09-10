#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/review_bot.py — final decision step of the PR review pipeline.

Reads the outcome of every required CI job (passed as CLI args from the
GitHub Actions workflow) and either auto-merges the PR (squash) or posts a
"changes requested" review with a summary of what failed. Never merges on
ambiguous state — any job result other than exactly "success" blocks.

Requires: `gh` CLI authenticated via GH_TOKEN env var with a token scoped
to contents:write + pull-requests:write on this repo (see docs/private-notes.md
for the fine-grained PAT setup — do not use a broad org token here).

Usage:
  python scripts/review_bot.py --pr 42 \\
      --check lint-typecheck=success \\
      --check artifact-scan=success \\
      --check regression-tests=success
"""
import sys
import argparse
import subprocess

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REQUIRED_GREEN = {"success"}


def gh(*args: str) -> str:
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"gh command failed: gh {' '.join(args)}", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)
    return result.stdout


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pr", required=True, help="PR number")
    ap.add_argument(
        "--check",
        action="append",
        required=True,
        metavar="name=status",
        help="Repeatable: a CI job name and its result, e.g. artifact-scan=success",
    )
    args = ap.parse_args()

    checks: dict[str, str] = {}
    for entry in args.check:
        if "=" not in entry:
            print(f"Malformed --check value (expected name=status): {entry}", file=sys.stderr)
            return 2
        name, status = entry.split("=", 1)
        checks[name] = status

    if not checks:
        print("No checks supplied — refusing to merge on no evidence.", file=sys.stderr)
        return 2

    all_green = all(status in REQUIRED_GREEN for status in checks.values())

    lines = [f"- **{name}**: {'PASS' if status in REQUIRED_GREEN else 'FAIL'} (`{status}`)"
              for name, status in checks.items()]
    body = "## Automated Review Bot\n\n" + "\n".join(lines)

    if all_green:
        body += "\n\nAll required checks passed. Auto-merging (squash)."
        gh("pr", "comment", args.pr, "--body", body)
        gh("pr", "merge", args.pr, "--squash", "--delete-branch", "--auto")
        print(f"PR #{args.pr}: all checks green, merge requested.")
        return 0

    body += "\n\nOne or more required checks failed. Merge blocked."
    gh("pr", "comment", args.pr, "--body", body)
    gh("pr", "review", args.pr, "--request-changes", "--body", "Automated checks failed — see bot comment above.")
    print(f"PR #{args.pr}: checks failed, merge blocked.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
