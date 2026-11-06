#!/usr/bin/env bash
# Git and GitHub steps shared by the review, coverage, fix, and slop runners.
#
#   pr_diff OUT PATHSPEC...          # diff from the merge base, 6 lines of context
#   review_prompt PROMPT_MD DIFF     # prompt file + the diff, to stdout
#   fix_changed                      # stage everything; true if anything is staged
#   push_fix BRANCH MESSAGE          # commit as github-actions and force-push BRANCH
#   fix_pr_url BRANCH                # URL of the open PR from BRANCH, or nothing
#   create_fix_pr BRANCH TITLE BODY  # open a skip-bots PR into HEAD_REF; print its URL
#   fix_compare_url BRANCH           # one-click URL for when create_fix_pr fails
#
# Expects BASE_SHA and HEAD_SHA for pr_diff; GITHUB_REPOSITORY and HEAD_REF
# for the PR helpers.
set -euo pipefail

pr_diff() {
  local out="$1"
  shift
  if ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null || ! git cat-file -e "${HEAD_SHA}^{commit}" 2>/dev/null; then
    git fetch --no-tags origin "$HEAD_SHA" "$BASE_SHA"
  fi
  git diff --unified=6 "$(git merge-base "$BASE_SHA" "$HEAD_SHA")" "$HEAD_SHA" -- "$@" > "$out"
}

review_prompt() {
  cat "$1"
  printf '\n---\n\n## The diff to review\n\n```diff\n'
  cat "$2"
  printf '\n```\n'
}

fix_changed() {
  git add -A
  ! git diff --cached --quiet
}

push_fix() {
  git -c user.name="github-actions[bot]" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit -m "$2"
  # bot-fix/pr-N/... is bot-owned; --force replaces a failed attempt.
  git push --force origin "HEAD:refs/heads/$1"
}

fix_pr_url() {
  gh pr list --repo "$GITHUB_REPOSITORY" --head "${GITHUB_REPOSITORY%%/*}:$1" \
    --state open --json url --jq '.[0].url // empty' || true
}

create_fix_pr() {
  local -a args=(
    --repo "$GITHUB_REPOSITORY"
    --base "$HEAD_REF"
    --head "${GITHUB_REPOSITORY%%/*}:$1"
    --title "$2"
    --body "$3"
  )
  gh label create skip-bots --repo "$GITHUB_REPOSITORY" \
    --description "Skip review bots" --force >/dev/null 2>&1 || true
  # Without the label so a missing-label error still opens the PR.
  gh pr create "${args[@]}" --label skip-bots || gh pr create "${args[@]}"
}

fix_compare_url() {
  echo "https://github.com/${GITHUB_REPOSITORY}/compare/${HEAD_REF}...$1?expand=1"
}
