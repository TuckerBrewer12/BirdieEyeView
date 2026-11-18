#!/usr/bin/env bash
# Env: BASE_SHA HEAD_SHA PR_NUMBER GH_TOKEN CURSOR_API_KEY
#      COVERAGE_JSON (optional, default frontend/coverage/coverage-final.json)
#      UI_COVERAGE_JSON (optional, default frontend/coverage/ui/coverage-final.json)
#      RUN_URL (optional link to the workflow run that holds the HTML report)
set -euo pipefail

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
# shellcheck source=cursor-run.sh
source "$(cd "$(dirname "$0")" && pwd)/cursor-run.sh"
REPO_ROOT="$(git rev-parse --show-toplevel)"
COVERAGE_JSON="${COVERAGE_JSON:-$REPO_ROOT/frontend/coverage/coverage-final.json}"
UI_COVERAGE_JSON="${UI_COVERAGE_JSON:-$REPO_ROOT/frontend/coverage/ui/coverage-final.json}"

BASE="$(git merge-base "$BASE_SHA" "$HEAD_SHA")"
git diff --unified=6 "$BASE" "$HEAD_SHA" -- frontend > "$WORK/diff.patch"

if [[ ! -s "$WORK/diff.patch" ]]; then
  echo "No changes under frontend/."
  exit 0
fi

python3 .github/review-bots/coverage_report.py lines \
  --coverage "$COVERAGE_JSON" \
  --diff "$WORK/diff.patch" \
  --repo "$REPO_ROOT" \
  > "$WORK/lines.json"

if [[ -f "$UI_COVERAGE_JSON" ]]; then
  python3 .github/review-bots/coverage_report.py lines \
    --coverage "$UI_COVERAGE_JSON" \
    --diff "$WORK/diff.patch" \
    --repo "$REPO_ROOT" \
    > "$WORK/ui.json"
fi

python3 .github/review-bots/coverage_report.py inventory \
  --root "$REPO_ROOT/frontend/src" \
  > "$WORK/inventory.md"

{
  cat .github/review-bots/frontend-coverage.md
  printf '\n---\n\n## Changed-line unit coverage (already computed — do not recount)\n\n```json\n'
  cat "$WORK/lines.json"
  printf '\n```\n'
  if [[ -f "$WORK/ui.json" ]]; then
    printf '\n## Changed-line UI test coverage (already computed — do not recount)\n\n```json\n'
    cat "$WORK/ui.json"
    printf '\n```\n'
  fi
  printf '\n## Existing screenshot and UI tests\n\n'
  cat "$WORK/inventory.md"
  printf '\n---\n\n## The diff\n\n```diff\n'
  cat "$WORK/diff.patch"
  printf '\n```\n'
} > "$WORK/prompt.txt"

post_comment() {
  if [[ -f "$WORK/ui.json" ]]; then
    python3 .github/review-bots/coverage_report.py comment \
      --lines "$WORK/lines.json" \
      --ui "$WORK/ui.json" \
      "$@"
  else
    python3 .github/review-bots/coverage_report.py comment \
      --lines "$WORK/lines.json" \
      "$@"
  fi
}

if ! cursor_run ask "$WORK/prompt.txt" "$WORK/ai.json"; then
  echo "::warning title=Frontend coverage::Cursor CLI failed; posting line coverage only."
  post_comment
  exit 0
fi

post_comment --ai "$WORK/ai.json"
