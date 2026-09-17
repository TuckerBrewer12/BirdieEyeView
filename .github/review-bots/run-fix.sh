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
  comment "Already opened [#${num}](${url}) with this change. Merge it into this branch if it looks right."
  exit 0
fi

# Same issue, different finding id (the model rephrased on a later commit).
open_prs="$(gh pr list --repo "$GITHUB_REPOSITORY" --base "$HEAD_REF" --state open \
  --json number,url,title,body,headRefName || echo '[]')"
similar="$(FINDING_JSON="$FINDING_JSON" OPEN_PRS="$open_prs" PR_NUMBER="$PR_NUMBER" \
  python3 "$BOTS/previous.py" already-open)"
if [[ "$similar" != "{}" && -n "$similar" ]]; then
  url="$(printf '%s\n' "$similar" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("url") or "")')"
  num="$(printf '%s\n' "$similar" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("number") or "")')"
  if [[ -n "$url" ]]; then
    echo "Similar fix PR already open: $url"
    comment "Already opened [#${num}](${url}) with this change. Merge it into this branch if it looks right."
    exit 0
  fi
fi

git checkout -B "$BRANCH"

# The model may edit files, but not run a shell or reach the network.
export OPENCODE_CONFIG_CONTENT='{
  "permission": { "edit": "allow", "bash": "deny", "webfetch": "deny" },
  "tools": { "write": true, "edit": true, "patch": true, "bash": false, "webfetch": false }
}'

FINDING_JSON="$FINDING_JSON" python3 "$BOTS/findings.py" prompt > "$WORK/prompt.txt"

if ! opencode run --model "$MODEL" "$(cat "$WORK/prompt.txt")"; then
  echo "::warning title=${BOT_NAME}::opencode failed; not opening a fix PR."
  comment "Tried to open a fix PR but the model failed. Reply \`/fix\` to retry."
  exit 0
fi

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  echo "No files changed."
  comment "Tried to apply this finding but the working tree was unchanged. Reply \`/fix\` to retry, or use the discuss link."
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit."
  comment "Tried to apply this finding but there was nothing to commit. Reply \`/fix\` to retry."
  exit 0
fi

git commit -m "$(cat <<EOF
Fix ${FINDING_PATH}

Addresses a ${BOT_NAME} finding on #${PR_NUMBER}.
EOF
)"

# These branches are bot-owned (`bot-fix/pr-N/...`); replacing a failed attempt
# is the point of --force, not rewriting anyone else's work.
git push --force origin "HEAD:refs/heads/${BRANCH}"

gh label create skip-bots --repo "$GITHUB_REPOSITORY" \
  --description "Skip review bots" --force >/dev/null 2>&1 || true

body="$(cat <<EOF
## What?

Implements a ${BOT_NAME} finding on #${PR_NUMBER}: ${FINDING_BODY}

## Why?

The review bot flagged this. Merge to take the change as a commit on #${PR_NUMBER}, or close it and use the discuss link on the original comment.
EOF
)"

create_pr() {
  gh pr create --repo "$GITHUB_REPOSITORY" \
    --base "$HEAD_REF" \
    --head "${OWNER}:${BRANCH}" \
    --title "[bot] ${FINDING_TITLE}" \
    "$@"
}

pr_url=""
if pr_url="$(create_pr --label skip-bots --body "$body")"; then
  :
elif pr_url="$(create_pr --body "$body")"; then
  :
else
  compare="https://github.com/${GITHUB_REPOSITORY}/compare/${HEAD_REF}...${BRANCH}?expand=1"
  echo "::error title=${BOT_NAME}::Could not open a fix PR. Enable Settings → Actions → General → Allow GitHub Actions to create and approve pull requests."
  comment "Pushed this change to \`${BRANCH}\` but could not open a PR. [Open it here](${compare}). Reply \`/fix\` to retry."
  exit 1
fi

pr_num="${pr_url##*/}"
comment "Opened [#${pr_num}](${pr_url}) with this change. Merge it into this branch if it looks right."
echo "$pr_url"
