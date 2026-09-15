#!/usr/bin/env bash
# Apply one review finding as a PR targeting the original PR's branch.
#
# Required env: FINDING_JSON PR_NUMBER HEAD_REF GITHUB_REPOSITORY GH_TOKEN
# Optional: HEAD_SHA BOT_MODEL OPENCODE_API_KEY
set -euo pipefail

BOTS="$(cd "$(dirname "$0")" && pwd)"
MODEL="${BOT_MODEL:-opencode/muse-spark-1.3-contributor-free}"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

eval "$(FINDING_JSON="$FINDING_JSON" python3 "$BOTS/findings.py" fields)"

OWNER="${GITHUB_REPOSITORY%%/*}"

comment() {
  local body="$1"
  local cid=""
  cid="$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" --paginate \
    --jq ".[] | select(.body | contains(\"\\\"id\\\":\\\"${FINDING_ID}\\\"\")) | .id" \
    2>/dev/null | head -n 1 || true)"
  if [[ -n "$cid" ]]; then
    gh api -X POST "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" \
      -f body="$body" -F in_reply_to="$cid" >/dev/null
  else
    gh pr comment "$PR_NUMBER" --repo "$GITHUB_REPOSITORY" --body "$body" >/dev/null
  fi
}

existing="$(gh pr list --repo "$GITHUB_REPOSITORY" --head "${OWNER}:${BRANCH}" \
  --json number,url --jq '.[0] // empty' || true)"
if [[ -n "$existing" ]]; then
  url="$(printf '%s\n' "$existing" | python3 -c 'import json,sys; print(json.load(sys.stdin)["url"])')"
  num="$(printf '%s\n' "$existing" | python3 -c 'import json,sys; print(json.load(sys.stdin)["number"])')"
  echo "Fix PR already open: $url"
  comment "Already opened #${num} with this change. Merge it into this branch if it looks right."
  exit 0
fi

git checkout -B "$BRANCH"

# The model may edit files, but not run a shell or reach the network. Verify
# and git are the runner's job.
export OPENCODE_CONFIG_CONTENT='{
  "permission": { "edit": "allow", "bash": "deny", "webfetch": "deny" },
  "tools": { "write": true, "edit": true, "patch": true, "bash": false, "webfetch": false }
}'

FINDING_JSON="$FINDING_JSON" python3 "$BOTS/findings.py" prompt > "$WORK/prompt.txt"

if ! opencode run --model "$MODEL" "$(cat "$WORK/prompt.txt")"; then
  echo "::warning title=${BOT_NAME}::opencode failed; not opening a fix PR."
  comment "Tried to open a fix PR for \`${RECIPE}\` but the model failed. Reply \`/fix\` to retry."
  exit 0
fi

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  echo "No files changed."
  comment "Tried to apply \`${RECIPE}\` but the working tree was unchanged. Reply \`/fix\` to retry, or use the discuss link."
  exit 0
fi

run_verify() {
  if [[ "$RECIPE" == "screenshot-coverage" ]]; then
    local specs
    specs="$(
      {
        git ls-files --others --exclude-standard -- 'frontend/src/brand/tests/screenshots/*.screenshot.spec.ts'
        git diff --name-only --diff-filter=A -- 'frontend/src/brand/tests/screenshots/*.screenshot.spec.ts'
      } | sed 's|^frontend/||' | sed '/^$/d' | sort -u
    )"
    if [[ -z "$specs" ]]; then
      echo "screenshot-coverage: no new spec file was added."
      return 1
    fi
    # shellcheck disable=SC2086
    (cd frontend && npx playwright test $specs --project=desktop --update-snapshots)
    return
  fi
  if [[ -n "$VERIFY" ]]; then
    bash -lc "$VERIFY"
  fi
}

if ! run_verify; then
  echo "::warning title=${BOT_NAME}::verify failed; not opening a fix PR."
  comment "Tried to apply \`${RECIPE}\` but verify failed. Reply \`/fix\` to retry, or use the discuss link."
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
if git diff --cached --quiet; then
  echo "Verify produced no committable changes."
  comment "Tried to apply \`${RECIPE}\` but there was nothing to commit. Reply \`/fix\` to retry."
  exit 0
fi

git commit -m "$(cat <<EOF
Apply ${RECIPE} on ${FINDING_PATH}

Addresses a ${BOT_NAME} finding on #${PR_NUMBER}.
EOF
)"

# These branches are bot-owned (`bot-fix/pr-N/...`); replacing a failed attempt
# is the point of --force, not rewriting anyone else's work.
git push --force origin "HEAD:refs/heads/${BRANCH}"

gh label create skip-bots --repo "$GITHUB_REPOSITORY" \
  --description "Skip review bots" --force >/dev/null 2>&1 || true

body="$(cat <<EOF
## Summary

- Implements a ${BOT_NAME} finding on #${PR_NUMBER}: ${FINDING_BODY}

**Recipe:** \`${RECIPE}\` — ${RECIPE_TITLE}

Merge this PR to take the change as a commit on #${PR_NUMBER}. If it is not
what you wanted, close it and use the discuss link on the original comment.

## Test plan

- [ ] The finding on #${PR_NUMBER} looks addressed
- [ ] No unrelated files changed
EOF
)"

if ! pr_url="$(
  gh pr create --repo "$GITHUB_REPOSITORY" \
    --base "$HEAD_REF" \
    --head "$BRANCH" \
    --title "[bot] ${RECIPE_TITLE}" \
    --label skip-bots \
    --body "$body"
)"; then
  pr_url="$(
    gh pr create --repo "$GITHUB_REPOSITORY" \
      --base "$HEAD_REF" \
      --head "$BRANCH" \
      --title "[bot] ${RECIPE_TITLE}" \
      --body "$body"
  )"
fi

pr_num="${pr_url##*/}"
comment "Opened #${pr_num} with this change. Merge it into this branch if it looks right."
echo "$pr_url"
