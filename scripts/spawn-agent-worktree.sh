#!/bin/sh
# scripts/spawn-agent-worktree.sh <task-id> <slug>
#
# Creates an isolated git worktree + branch for one agent/feature, so
# multiple agents can work on this repo in parallel without branch-switch
# or lockfile collisions. Each worktree gets its own node_modules/venv.
#
# Usage:
#   sh scripts/spawn-agent-worktree.sh EC-142 swipe-nav
#   # -> creates ../wt-EC-142 on branch agent/EC-142/swipe-nav

set -eu

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <task-id> <slug>" >&2
    exit 1
fi

TASK_ID="$1"
SLUG="$2"
BRANCH="agent/${TASK_ID}/${SLUG}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKDIR="$(dirname "$REPO_ROOT")/wt-${TASK_ID}"

if [ -d "$WORKDIR" ]; then
    echo "Worktree already exists: $WORKDIR" >&2
    exit 1
fi

git fetch origin main
git worktree add "$WORKDIR" -b "$BRANCH" origin/main

echo "Installing dependencies in the new worktree (isolated from other agents)..."
if [ -f "$WORKDIR/frontend/package.json" ]; then
    ( cd "$WORKDIR/frontend" && npm ci )
fi
if [ -f "$WORKDIR/backend/requirements.txt" ]; then
    ( cd "$WORKDIR/backend" && python -m venv .venv && \
      .venv/Scripts/pip install -r requirements.txt 2>/dev/null || \
      .venv/bin/pip install -r requirements.txt )
fi

echo ""
echo "Worktree ready:"
echo "  Path:   $WORKDIR"
echo "  Branch: $BRANCH"
echo ""
echo "To clean up after the PR merges:"
echo "  git worktree remove '$WORKDIR'"
echo "  git branch -d '$BRANCH'"
