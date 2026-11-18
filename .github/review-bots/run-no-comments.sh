#!/usr/bin/env bash
# Env: BASE_SHA HEAD_SHA HEAD_REF PR_NUMBER GITHUB_REPOSITORY GH_TOKEN CURSOR_API_KEY TYPESCRIPT_MODULE
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1

BOTS="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
# shellcheck source=cursor-run.sh
source "$BOTS/cursor-run.sh"

BOT_NAME="✂️ No Comments Bot"
SUBJECT="Delete comments added in #${PR_NUMBER}"

if [[ "$GITHUB_EVENT_NAME" == "pull_request" && "$(git log -1 --format=%s "$HEAD_SHA")" == "$SUBJECT" ]]; then
  echo "The head commit is this bot's own."
  exit 0
fi

BASE="$(git merge-base "$BASE_SHA" "$HEAD_SHA")"
git diff --unified=6 "$BASE" "$HEAD_SHA" -- \
  '*.py' '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' \
  ':!*.gen.ts' ':!frontend/src/types/' > "$WORK/diff.patch"

if ! grep -qE "^\+[^+].*(#|//|/\*|\"\"\"|''')" "$WORK/diff.patch"; then
  echo "This PR adds no comments."
  exit 0
fi

{
  cat "$BOTS/no-comments.md"
  printf '\n---\n\n## The diff\n\n```diff\n'
  cat "$WORK/diff.patch"
  printf '\n```\n'
} > "$WORK/prompt.txt"

if ! cursor_run edit "$WORK/prompt.txt" "$WORK/reply-1.txt"; then
  echo "::error title=${BOT_NAME}::Cursor CLI failed; no comments deleted."
  exit 1
fi
rejected="$(python3 "$BOTS/comment_guard.py" check --base "$BASE" --report "$WORK/guard.json")"

replies=(--reply "$WORK/reply-1.txt")
if [[ -n "$rejected" ]]; then
  echo "$rejected"
  {
    cat "$WORK/prompt.txt"
    printf '\n---\n\n## Your last edit to these files was reverted\n\n%s\n\n' "$rejected"
    printf 'Delete only the comments in them this time. The other files keep your edit.\n'
  } > "$WORK/retry.txt"
  if cursor_run edit "$WORK/retry.txt" "$WORK/reply-2.txt"; then
    replies+=(--reply "$WORK/reply-2.txt")
  fi
  python3 "$BOTS/comment_guard.py" check --base "$BASE" --report "$WORK/guard.json"
fi

commit=""
if ! git diff --quiet; then
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git commit --quiet -am "$SUBJECT" \
    -m "The ${BOT_NAME} deleted them, following pstack's no-comments skill. Revert this commit to bring any back."
  if git push origin "HEAD:refs/heads/${HEAD_REF}"; then
    commit="$(git rev-parse HEAD)"
  else
    echo "::warning title=${BOT_NAME}::${HEAD_REF} moved on; the next run deletes them."
    exit 0
  fi
fi

python3 "$BOTS/comment_guard.py" comment --guard "$WORK/guard.json" "${replies[@]}" --commit "$commit"
