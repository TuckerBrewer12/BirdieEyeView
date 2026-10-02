#!/usr/bin/env bash
# One sticky pass/fail comment. On fail, one PR that fixes every flagged comment.
set -euo pipefail

BOTS="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# shellcheck source=cursor-run.sh
source "$BOTS/cursor-run.sh"

: "${BOT_NAME:?}"
: "${BOT_PROMPT:?}"
: "${BOT_PATHSPEC:?}"
: "${BASE_SHA:?}"
: "${HEAD_SHA:?}"
: "${PR_NUMBER:?}"
: "${HEAD_REF:?}"
: "${GITHUB_REPOSITORY:?}"

if ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null || ! git cat-file -e "${HEAD_SHA}^{commit}" 2>/dev/null; then
  git fetch --no-tags origin "$HEAD_SHA" "$BASE_SHA"
fi

BASE="$(git merge-base "$BASE_SHA" "$HEAD_SHA")"
# shellcheck disable=SC2086
git diff --unified=6 "$BASE" "$HEAD_SHA" -- $BOT_PATHSPEC > "$WORK/diff.patch"

if [[ ! -s "$WORK/diff.patch" ]]; then
  echo "No changes under '${BOT_PATHSPEC}'."
  exit 0
fi

git checkout --detach "$HEAD_SHA"

{
  cat "$BOT_PROMPT"
  printf '\n---\n\n## The diff to review\n\n```diff\n'
  cat "$WORK/diff.patch"
  printf '\n```\n'
} > "$WORK/prompt.txt"

if ! cursor_run ask "$WORK/prompt.txt" "$WORK/findings.json"; then
  echo "::error title=${BOT_NAME}::Cursor CLI failed; not reviewing."
  exit 1
fi

if ! python3 "$BOTS/slop_report.py" prepare \
  --findings "$WORK/findings.json" \
  --diff "$WORK/diff.patch" \
  --report "$WORK/report.json" \
  --prompt "$WORK/fix-prompt.txt"; then
  exit 1
fi

verdict="$(python3 "$BOTS/slop_report.py" field --report "$WORK/report.json" --name verdict)"
branch="$(python3 "$BOTS/slop_report.py" field --report "$WORK/report.json" --name branch)"
owner="${GITHUB_REPOSITORY%%/*}"

open_fix_pr() {
  local compare pr_url existing body
  git checkout -B "$branch" "$HEAD_SHA"

  if ! cursor_run edit "$WORK/fix-prompt.txt"; then
    echo "::error title=${BOT_NAME}::Cursor CLI failed while applying comment fixes."
    return 1
  fi

  if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    echo "Fix changed no files."
    return 0
  fi

  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add -A
  if git diff --cached --quiet; then
    echo "Nothing to commit."
    return 0
  fi

  git commit -m "$(cat <<EOF
Trim comments flagged by Slop Control

Addresses the Slop Control report on #${PR_NUMBER}.
EOF
)"

  # bot-fix/pr-N/slop is bot-owned; --force replaces a failed attempt.
  git push --force origin "HEAD:refs/heads/${branch}"

  gh label create skip-bots --repo "$GITHUB_REPOSITORY" \
    --description "Skip review bots" --force >/dev/null 2>&1 || true

  existing="$(gh pr list --repo "$GITHUB_REPOSITORY" --head "${owner}:${branch}" \
    --state open --json url --jq '.[0].url // empty' || true)"
  if [[ -n "$existing" ]]; then
    printf '%s\n' "$existing" > "$WORK/fix_url"
    echo "Fix PR already open: $existing"
    return 0
  fi

  body="$(python3 "$BOTS/slop_report.py" pr-body)"
  compare="https://github.com/${GITHUB_REPOSITORY}/compare/${HEAD_REF}...${branch}?expand=1"
  if pr_url="$(gh pr create --repo "$GITHUB_REPOSITORY" \
    --base "$HEAD_REF" \
    --head "${owner}:${branch}" \
    --title "[bot] Trim comments flagged by Slop Control" \
    --label skip-bots \
    --body "$body")"; then
    printf '%s\n' "$pr_url" > "$WORK/fix_url"
    echo "$pr_url"
    return 0
  fi
  if pr_url="$(gh pr create --repo "$GITHUB_REPOSITORY" \
    --base "$HEAD_REF" \
    --head "${owner}:${branch}" \
    --title "[bot] Trim comments flagged by Slop Control" \
    --body "$body")"; then
    printf '%s\n' "$pr_url" > "$WORK/fix_url"
    echo "$pr_url"
    return 0
  fi

  echo "::error title=${BOT_NAME}::Could not open a fix PR."
  printf '%s\n' "$compare" > "$WORK/compare_url"
  return 1
}

fix_url=""
compare_url=""
fix_status=0
if [[ "$verdict" == "fail" ]]; then
  set +e
  ( trap - EXIT; set -euo pipefail; open_fix_pr )
  fix_status=$?
  set -e
  if [[ -f "$WORK/fix_url" ]]; then
    fix_url="$(<"$WORK/fix_url")"
  fi
  if [[ -f "$WORK/compare_url" ]]; then
    compare_url="$(<"$WORK/compare_url")"
  fi
else
  number="$(gh pr list --repo "$GITHUB_REPOSITORY" --head "${owner}:${branch}" \
    --state open --json number --jq '.[0].number // empty' || true)"
  if [[ -n "$number" ]]; then
    gh pr close "$number" --repo "$GITHUB_REPOSITORY" \
      --comment "Slop Control passes on the latest commit, so this fix is no longer needed." || true
  fi
fi

python3 "$BOTS/slop_report.py" comment \
  --report "$WORK/report.json" \
  --fix-url "$fix_url" \
  --compare-url "$compare_url"

if [[ -n "$compare_url" ]]; then
  exit 1
fi
if [[ "$verdict" == "fail" && -z "$fix_url" && "$fix_status" -ne 0 ]]; then
  exit 1
fi
