#!/usr/bin/env bash
# Frontend coverage reporter.
# Vitest changed-line % is computed in Python. Screenshot / espresso counts
# come from the model. One sticky PR comment consolidates both.
#
# Env: BASE_SHA HEAD_SHA PR_NUMBER GH_TOKEN OPENCODE_API_KEY
#      COVERAGE_JSON (optional, default frontend/coverage/coverage-final.json)
set -euo pipefail

MODEL="${BOT_MODEL:-opencode/muse-spark-1.3-contributor-free}"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
REPO_ROOT="$(git rev-parse --show-toplevel)"
COVERAGE_JSON="${COVERAGE_JSON:-$REPO_ROOT/frontend/coverage/coverage-final.json}"

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

python3 .github/review-bots/coverage_report.py inventory \
  --root "$REPO_ROOT/frontend/src" \
  > "$WORK/inventory.md"

{
  cat .github/review-bots/frontend-coverage.md
  printf '\n---\n\n## Changed-line unit coverage (already computed — do not recount)\n\n```json\n'
  cat "$WORK/lines.json"
  printf '\n```\n\n## Existing screenshot and espresso tests\n\n'
  cat "$WORK/inventory.md"
  printf '\n---\n\n## The diff\n\n```diff\n'
  cat "$WORK/diff.patch"
  printf '\n```\n'
} > "$WORK/prompt.txt"

export OPENCODE_CONFIG_CONTENT='{
  "permission": { "edit": "deny", "bash": "deny", "webfetch": "deny" },
  "tools": { "write": false, "edit": false, "patch": false, "bash": false, "webfetch": false }
}'

if ! opencode run --model "$MODEL" "$(cat "$WORK/prompt.txt")" > "$WORK/ai.json"; then
  echo "::warning title=Frontend coverage::opencode failed; posting unit coverage only."
  python3 .github/review-bots/coverage_report.py comment \
    --lines "$WORK/lines.json"
  exit 0
fi

python3 .github/review-bots/coverage_report.py comment \
  --lines "$WORK/lines.json" \
  --ai "$WORK/ai.json"
