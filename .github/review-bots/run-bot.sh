#!/usr/bin/env bash
# Shared review bot runner.
# Posts a review: one inline comment per finding, plus a summary.
#
# Per-bot env: BOT_NAME BOT_PROMPT BOT_PATHSPEC BOT_CLEAN BOT_LEAD
set -euo pipefail

MODEL="${BOT_MODEL:-opencode/muse-spark-1.3-contributor-free}"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

BASE="$(git merge-base "$BASE_SHA" "$HEAD_SHA")"
# shellcheck disable=SC2086
git diff --unified=6 "$BASE" "$HEAD_SHA" -- $BOT_PATHSPEC > "$WORK/diff.patch"

if [[ ! -s "$WORK/diff.patch" ]]; then
  echo "No changes under '${BOT_PATHSPEC}'."; exit 0
fi

{
  cat "$BOT_PROMPT"
  printf '\n---\n\n## The diff to review\n\n```diff\n'
  cat "$WORK/diff.patch"
  printf '\n```\n'
} > "$WORK/prompt.txt"

# The model may read the repo, but not modify it or reach the network.
export OPENCODE_CONFIG_CONTENT='{
  "permission": { "edit": "deny", "bash": "deny", "webfetch": "deny" },
  "tools": { "write": false, "edit": false, "patch": false, "bash": false, "webfetch": false }
}'

if ! opencode run --model "$MODEL" "$(cat "$WORK/prompt.txt")" > "$WORK/findings.json"; then
  echo "::warning title=${BOT_NAME}::opencode failed; not reviewing."; exit 0
fi

if ! python3 .github/review-bots/post_review.py \
     "$WORK/findings.json" "$WORK/diff.patch" "$HEAD_SHA" "$WORK/review.json"; then
  exit 0
fi

gh api -X POST "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/reviews" \
  --input "$WORK/review.json" --jq '.html_url'
