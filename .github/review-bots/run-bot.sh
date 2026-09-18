#!/usr/bin/env bash
# Shared review bot runner.
# Posts a review: one inline comment per *new* finding, plus a summary.
# Rechecks comments this bot already left (✅ fixed / ❌ still open).
# New findings are written to GITHUB_OUTPUT so a follow-up job can open one
# fix PR per finding against this branch.
#
# Per-bot env: BOT_NAME BOT_PROMPT BOT_PATHSPEC BOT_CLEAN BOT_LEAD
set -euo pipefail

BOTS="$(cd "$(dirname "$0")" && pwd)"
MODEL="${BOT_MODEL:-opencode/muse-spark-1.3-contributor-free}"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

emit_no_fixes() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "has_fixes=false" >> "$GITHUB_OUTPUT"
    echo "findings=[]" >> "$GITHUB_OUTPUT"
  fi
}

BASE="$(git merge-base "$BASE_SHA" "$HEAD_SHA")"
# shellcheck disable=SC2086
git diff --unified=6 "$BASE" "$HEAD_SHA" -- $BOT_PATHSPEC > "$WORK/diff.patch"

if [[ ! -s "$WORK/diff.patch" ]]; then
  echo "No changes under '${BOT_PATHSPEC}'."
  emit_no_fixes
  exit 0
fi

gh api --paginate "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" \
  > "$WORK/comments.json" || echo '[]' > "$WORK/comments.json"
gh api --paginate "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/reviews" \
  > "$WORK/reviews.json" || echo '[]' > "$WORK/reviews.json"

COMMENTS_JSON="$WORK/comments.json" REVIEWS_JSON="$WORK/reviews.json" \
  python3 "$BOTS/previous.py" collect > "$WORK/previous.json"

{
  cat "$BOT_PROMPT"
  printf '\n---\n\n## The diff to review\n\n```diff\n'
  cat "$WORK/diff.patch"
  printf '\n```\n'
} > "$WORK/prompt.txt"

BOTS_DIR="$BOTS" PREVIOUS_JSON="$WORK/previous.json" python3 - "$WORK/prompt.txt" <<'PY'
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.environ["BOTS_DIR"])
import previous as previous_mod

prompt_path = Path(sys.argv[1])
raw = Path(os.environ["PREVIOUS_JSON"]).read_text().strip() or "[]"
items = json.loads(raw)
if not isinstance(items, list):
    items = []
prompt_path.write_text(prompt_path.read_text() + previous_mod.prompt_appendix(items))
PY

# The model may read the repo, but not modify it or reach the network.
export OPENCODE_CONFIG_CONTENT='{
  "permission": { "edit": "deny", "bash": "deny", "webfetch": "deny" },
  "tools": { "write": false, "edit": false, "patch": false, "bash": false, "webfetch": false }
}'

if ! opencode run --model "$MODEL" "$(cat "$WORK/prompt.txt")" > "$WORK/findings.json"; then
  echo "::warning title=${BOT_NAME}::opencode failed; not reviewing."
  emit_no_fixes
  exit 0
fi

export PR_URL="${PR_URL:-https://github.com/${GITHUB_REPOSITORY}/pull/${PR_NUMBER}}"

if ! python3 "$BOTS/post_review.py" \
     "$WORK/findings.json" "$WORK/diff.patch" "$HEAD_SHA" "$WORK/review.json" \
     "$WORK/fixable.json" "$WORK/previous.json" "$WORK/replies.json"; then
  emit_no_fixes
  exit 0
fi

# GitHub often 422s "Line could not be resolved" if the PR diff is still
# indexing. Retry here so a later Re-run is only needed when it stays broken.
MAX_ATTEMPTS="${BOT_POST_ATTEMPTS:-5}"
delay="${BOT_POST_RETRY_DELAY:-5}"
attempt=1
until gh api -X POST "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/reviews" \
      --input "$WORK/review.json" --jq '.html_url'
do
  status=$?
  if (( attempt >= MAX_ATTEMPTS )); then
    echo "::error title=${BOT_NAME}::Failed to post review after ${MAX_ATTEMPTS} attempts. Re-run this job from the Actions tab or the PR checks list."
    emit_no_fixes
    exit "$status"
  fi
  echo "Posting review failed (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${delay}s..."
  sleep "$delay"
  attempt=$((attempt + 1))
  delay=$((delay * 2))
done

if [[ -s "$WORK/replies.json" && "$(cat "$WORK/replies.json")" != "[]" ]]; then
  python3 - "$WORK/replies.json" <<'PY'
import json
import os
import subprocess
import sys
from pathlib import Path

replies = json.loads(Path(sys.argv[1]).read_text())
repo = os.environ["GITHUB_REPOSITORY"]
pr = os.environ["PR_NUMBER"]
workdir = Path(os.environ.get("RUNNER_TEMP") or "/tmp")
for i, reply in enumerate(replies):
    payload = workdir / f"review-bot-reply-{i}.json"
    payload.write_text(json.dumps(reply))
    subprocess.run(
        [
            "gh",
            "api",
            "-X",
            "POST",
            f"repos/{repo}/pulls/{pr}/comments",
            "--input",
            str(payload),
        ],
        check=False,
    )
PY
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  fixable="$(cat "$WORK/fixable.json")"
  if [[ "$fixable" != "[]" ]]; then
    echo "has_fixes=true" >> "$GITHUB_OUTPUT"
    {
      echo "findings<<EOF"
      printf '%s\n' "$fixable"
      echo "EOF"
    } >> "$GITHUB_OUTPUT"
  else
    emit_no_fixes
  fi
fi
