#!/usr/bin/env bash
# Apply one review finding as a PR targeting the original PR's branch.
#
# Required env: FINDING_JSON PR_NUMBER HEAD_REF GITHUB_REPOSITORY GH_TOKEN
# Optional: HEAD_SHA BOT_MODEL CURSOR_API_KEY
set -euo pipefail

BOTS="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
# shellcheck source=cursor-run.sh
source "$BOTS/cursor-run.sh"
# shellcheck source=pr-lib.sh
source "$BOTS/pr-lib.sh"

eval "$(FINDING_JSON="$FINDING_JSON" python3 "$BOTS/findings.py" fields)"

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

url="$(fix_pr_url "$BRANCH")"
if [[ -n "$url" ]]; then
  echo "Fix PR already open: $url"
  comment "Already opened [#${url##*/}](${url}) with this change. Merge it into this branch if it looks right."
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

FINDING_JSON="$FINDING_JSON" python3 "$BOTS/findings.py" prompt > "$WORK/prompt.txt"

if ! cursor_run edit "$WORK/prompt.txt"; then
  echo "::error title=${BOT_NAME}::Cursor CLI failed; not opening a fix PR."
  comment "Tried to open a fix PR but the model failed. Reply \`/fix\` to retry."
  exit 1
fi

if ! fix_changed; then
  echo "No files changed."
  comment "Tried to apply this finding but the working tree was unchanged. Reply \`/fix\` to retry, or use the discuss link."
  exit 0
fi

push_fix "$BRANCH" "$(cat <<EOF
Fix ${FINDING_PATH}

Addresses a ${BOT_NAME} finding on #${PR_NUMBER}.
EOF
)"

body="$(cat <<EOF
## What?

Implements a ${BOT_NAME} finding on #${PR_NUMBER}: ${FINDING_BODY}

## Why?

The review bot flagged this. Merge to take the change as a commit on #${PR_NUMBER}, or close it and use the discuss link on the original comment.
EOF
)"

if ! pr_url="$(create_fix_pr "$BRANCH" "[bot] ${FINDING_TITLE}" "$body")"; then
  compare="$(fix_compare_url "$BRANCH")"
  echo "::error title=${BOT_NAME}::Could not open a fix PR. Enable Settings → Actions → General → Allow GitHub Actions to create and approve pull requests."
  comment "Pushed this change to \`${BRANCH}\` but could not open a PR. [Open it here](${compare}). Reply \`/fix\` to retry."
  exit 1
fi

pr_num="${pr_url##*/}"
comment "Opened [#${pr_num}](${pr_url}) with this change. Merge it into this branch if it looks right."
echo "$pr_url"
