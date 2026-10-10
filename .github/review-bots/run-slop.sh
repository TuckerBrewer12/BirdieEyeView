#!/usr/bin/env bash
# One sticky pass/fail comment. On fail, one PR that fixes every flagged comment.
#
#   run-slop.sh review   # read-only: model review, comment, report to GITHUB_OUTPUT
#   run-slop.sh fix      # SLOP_REPORT from review: apply, push, open the fix PR
set -euo pipefail

BOTS="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
# shellcheck source=cursor-run.sh
source "$BOTS/cursor-run.sh"
# shellcheck source=pr-lib.sh
source "$BOTS/pr-lib.sh"

: "${BOT_NAME:?}"
: "${HEAD_SHA:?}"
: "${PR_NUMBER:?}"
: "${GITHUB_REPOSITORY:?}"

report() {
  python3 "$BOTS/slop_report.py" "$@"
}

review() {
  : "${BOT_PROMPT:?}"
  : "${BOT_PATHSPEC:?}"
  : "${BASE_SHA:?}"

  # shellcheck disable=SC2086
  pr_diff "$WORK/diff.patch" $BOT_PATHSPEC
  if [[ -s "$WORK/diff.patch" ]]; then
    git checkout --detach "$HEAD_SHA"
    review_prompt "$BOT_PROMPT" "$WORK/diff.patch" > "$WORK/prompt.txt"
    if ! cursor_run ask "$WORK/prompt.txt" "$WORK/findings.json"; then
      echo "::error title=${BOT_NAME}::Cursor CLI failed; not reviewing."
      exit 1
    fi
  else
    echo '[]' > "$WORK/findings.json"
  fi

  report prepare --findings "$WORK/findings.json" --diff "$WORK/diff.patch" --report "$WORK/report.json"
  verdict="$(report field --report "$WORK/report.json" --name verdict)"

  if [[ "$verdict" == "pass" ]]; then
    stale="$(fix_pr_url "$(report field --report "$WORK/report.json" --name branch)")"
    if [[ -n "$stale" ]]; then
      gh pr close "$stale" --repo "$GITHUB_REPOSITORY" \
        --comment "Slop Control passes on the latest commit, so this fix is no longer needed." || true
    fi
    report comment --report "$WORK/report.json"
  else
    report comment --report "$WORK/report.json" --pending
  fi

  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "verdict=${verdict}" >> "$GITHUB_OUTPUT"
    echo "report=$(report field --report "$WORK/report.json" --name json)" >> "$GITHUB_OUTPUT"
  fi
}

fix() {
  : "${SLOP_REPORT:?}"
  : "${HEAD_REF:?}"
  local branch pr_url="" compare_url=""

  printf '%s\n' "$SLOP_REPORT" > "$WORK/report.json"
  report fix-prompt --report "$WORK/report.json" > "$WORK/fix-prompt.txt"
  branch="$(report field --report "$WORK/report.json" --name branch)"

  git checkout -B "$branch" "$HEAD_SHA"
  if ! cursor_run edit "$WORK/fix-prompt.txt"; then
    echo "::error title=${BOT_NAME}::Cursor CLI failed while applying comment fixes."
    report comment --report "$WORK/report.json"
    exit 1
  fi

  if ! fix_changed; then
    echo "Fix changed no files."
    report comment --report "$WORK/report.json"
    exit 0
  fi

  push_fix "$branch" "$(cat <<EOF
Trim comments flagged by Slop Control

Addresses the Slop Control report on #${PR_NUMBER}.
EOF
)"

  pr_url="$(fix_pr_url "$branch")"
  if [[ -z "$pr_url" ]] && ! pr_url="$(create_fix_pr "$branch" \
      "[bot] Trim comments flagged by Slop Control" "$(report pr-body)")"; then
    echo "::error title=${BOT_NAME}::Could not open a fix PR. Enable Settings → Actions → General → Allow GitHub Actions to create and approve pull requests."
    compare_url="$(fix_compare_url "$branch")"
  fi

  report comment --report "$WORK/report.json" --fix-url "$pr_url" --compare-url "$compare_url"
  if [[ -n "$compare_url" ]]; then
    exit 1
  fi
}

case "${1:-}" in
  review) review ;;
  fix) fix ;;
  *) echo "usage: run-slop.sh review|fix" >&2; exit 2 ;;
esac
