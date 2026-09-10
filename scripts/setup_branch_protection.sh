#!/bin/sh
# scripts/setup_branch_protection.sh
#
# One-time setup: makes the PR Review Bot's checks REQUIRED on main, so no
# one (including repo admins) can merge a PR while lint-typecheck,
# artifact-scan, or regression-tests is red or hasn't run.
#
# Run manually once (needs an authenticated `gh` with admin rights on the repo):
#   sh scripts/setup_branch_protection.sh
#
# Safe to re-run — it's idempotent (PUT replaces the whole protection config).

set -eu

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Applying branch protection to: $REPO (branch: main)"

gh api "repos/${REPO}/branches/main/protection" -X PUT --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint-typecheck", "artifact-scan", "regression-tests"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON

echo "Done. main now requires: lint-typecheck, artifact-scan, regression-tests to pass before merge."
