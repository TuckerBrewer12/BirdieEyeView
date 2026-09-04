#!/usr/bin/env bash
# Brand Kit Bot — flags hardcoded colors in changed UI code.
# Posts a review: one inline comment per finding, plus a summary.
set -euo pipefail

MODEL="${BOT_MODEL:-opencode/muse-spark-1.3-contributor-free}"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

BASE="$(git merge-base "$BASE_SHA" "$HEAD_SHA")"
git diff --unified=6 "$BASE" "$HEAD_SHA" \
  -- frontend/src/components frontend/src/pages > "$WORK/diff.patch"

if [[ ! -s "$WORK/diff.patch" ]]; then
  echo "No UI changes."; exit 0
fi

{
  cat .github/review-bots/brand-kit.md
  printf '\n---\n\n## The diff to review\n\n```diff\n'
  cat "$WORK/diff.patch"
  printf '\n```\n'
} > "$WORK/prompt.txt"

# The model may read the repo, but not modify it or reach the network.
export OPENCODE_CONFIG_CONTENT='{
  "permission": { "edit": "deny", "bash": "deny", "webfetch": "deny" },
  "tools": { "write": false, "edit": false, "patch": false, "bash": false, "webfetch": false }
}'

if ! opencode run --quiet --model "$MODEL" "$(cat "$WORK/prompt.txt")" > "$WORK/findings.json"; then
  echo "::warning title=Brand Kit Bot::opencode failed; not reviewing."; exit 0
fi

if ! python3 .github/review-bots/post_review.py \
     "$WORK/findings.json" "$WORK/diff.patch" "$HEAD_SHA" "$WORK/review.json"; then
  exit 0
fi

gh api -X POST "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/reviews" \
  --input "$WORK/review.json" --jq '.html_url'
