---
name: ship-pr
description: "Project-specific commit, push and pull request text workflow for the Golf ScoreCard app. Use only when the user explicitly asks to commit, push, \"commit and push\", or write the PR description or PR text for a change in this repository. Stages explicit paths, splits commits when the plan says so, pushes the branch, and writes the PR description for the user to paste. Never opens a pull request."
---

# Ship PR

## Purpose

Turn a finished change into commits, a pushed branch and PR text. The user opens the pull request.

Run this only when the user explicitly asks to commit, push, or write the PR text, and do only what they asked: "write the PR text" is not a request to commit, and "commit" is not a request to push. Never commit or push on your own initiative, including at the end of a finished task.

## 1. Pre-flight

1. Run `git branch --show-current` and `git status --short`.
2. Confirm the branch:
   - Feature branches come off `backend-refactor`, the parent branch for the refactor roadmap, and their PRs target it.
   - Never commit to `main` or `backend-refactor`. If the work sits on one of them, stop and ask which branch to use.
   - Skill changes follow Skill Changes below.
3. Check whether the branch's PR already merged: `gh pr list --state merged --head <branch>`. PRs are squash-merged, so commit ancestry does not show it. On a feature branch, a merged PR means new commits need a new branch; ask the user.
4. A branch stacked on another unmerged branch: once the parent's PR merges, merge `origin/backend-refactor` into it (a merge, not a rebase, so no force-push is needed) and rerun the gates.
5. Confirm the Final Gates in `.codex/skills/implementation-loop/SKILL.md` passed in this session on the code being committed. If code changed since, or they ran in another session, rerun them. Do not restate or skip them here. Stop and report a failure; do not commit over it.

## 2. Decide What Goes In

Build the list of paths from `git status --short`, not `git diff --stat`: new files only show as `??` in status.

- **Stage:** the files the implementation plan (`.codex/change-artifacts/implementation/<branch-slug>.md`) and its amendments name (for a `$bug-fix` change, the files its approved confirmation message names), plus the files the change generated (`frontend/openapi.json`, `frontend/src/types/api.gen.ts`, screenshot baselines), including new untracked files.
- **Leave out:** everything else. Never stage these, even when the plan lists them under docs to update:
  - `handoff.md`, `1. Fix backend consistency issues*.md`, `outputs/`, and any other local notes at the repository root;
  - any `.DS_Store`. The root one is tracked; leave its modification unstaged;
  - `.codex/change-artifacts/`.
- A file that is neither planned nor clearly local: ask before staging it.

Write the list down, with each left-out path and why. It goes in the report.

## 3. Stage And Commit

- Stage explicit paths only: `git add -- <path> <path> …`. Never `git add -A`, `git add .` or `git commit -a`. Interactive `git add -p` is not available.
- Before each commit, check `git diff --cached --stat` against the list for that commit.
- Never `--no-verify`, `--amend` a pushed commit, or rewrite pushed history.

### Split Commits

When the plan splits the change into commits (`docs/practices/shared.md` keeps behavior-preserving cleanup separate from behavior changes), commit them in the plan's order:

1. Get a patch holding exactly commit 1's changes to tracked files:
   - Best: one saved during implementation, before commit 2's edits began: `git diff -- <commit 1 paths> > <scratch>/commit1.patch`, naming paths so no binary file such as `.DS_Store` is in it.
   - When commit 1 and commit 2 changed the same file and no patch was saved: create a temporary worktree at `HEAD` in the scratch directory (`git worktree add --detach <scratch>/commit1 HEAD`), copy in commit 1's whole files, make commit 1's edits by hand in the shared files, then `git -C <scratch>/commit1 diff > <scratch>/commit1.patch`.
2. `git apply --cached --check <scratch>/commit1.patch`, then `git apply --cached <scratch>/commit1.patch`. This stages commit 1 without touching the working tree. Stage commit 1's new files with `git add -- <path>`.
3. Check `git diff --cached --stat` and `git diff --cached`, then commit.
4. Stage the remaining planned paths explicitly for commit 2, check, commit.
5. Docs and tests go in the commit whose change they describe or prove. `CLAUDE.md` and `AGENTS.md` change together (`tests/test_agent_docs.py`).

Optionally prove commit 1 stands alone: check it out in a temporary worktree (`git worktree add --detach <scratch>/commit1-check <commit 1 SHA>`), run the unit suite there, then `git worktree remove` it. Do this when the plan says commit 1 must pass on its own or when commit 1 was cut by hand. Remove any temporary worktree before reporting.

### Commit Messages

Match `git log origin/backend-refactor`:

- Imperative subject in sentence case, no trailing period, about 70 characters at most.
- A body saying what changed and why, in plain prose or short bullets, wrapped near 72 columns.
- End with the attribution line from the session's instructions.

Use a heredoc so the lines survive:

```bash
git commit -F - <<'EOF'
Subject line

Body.

<attribution line>
EOF
```

## 4. Push

`git push -u origin <branch>`. Never force-push, and never push to `backend-refactor` or `main`, unless the user explicitly says so. If the push is rejected, stop and report it.

## 5. PR Text

Write the description; never run `gh pr create`.

- Give a title (it becomes the squash commit's subject, so write it like one) and the base branch, `backend-refactor` unless the user said otherwise.
- The body follows `.github/pull_request_template.md` exactly: `## What?` then `## Why?`, nothing else around them.
- Write for a reader who was not in the session: no artifact names, plan option codes (1A, 3B), or session shorthand. Name the roadmap step when there is one.
- Keep each section self-contained, with a clear end. Short paragraphs or bullets, one idea each. What lists files, behavior, contract changes, the frontend impact (or "no frontend change"), and tests by layer; Why gives the problem and the reason. Nothing from What continues into Why.
- When the PR has several commits, say what each commit holds so the reviewer can read them apart.
- For a change in `$parser-eval`'s scope, What gives the eval result per suite (baseline → after) and any regression the user accepted, with the reason.
- End the body with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

PRs #719 and #720 (`gh pr view <n> --json body`) show the style.

## Skill Changes

Changes to `.codex/skills/` (and their `.claude/skills/` wrappers) ship on branch `update-codex-skills`, in the worktree `.claude/worktrees/update-codex-skills`:

- This branch is reused: earlier PRs from it have merged, and that is expected. Before committing, `git fetch` and merge `origin/backend-refactor` into it.
- Commit skill changes separately from app changes, and never on a feature branch.
- Other sessions may be editing in the same worktree. Stage only the files this session changed.

## 6. Report

End with:

- each commit's short SHA and subject;
- the branch pushed and its upstream, or "not pushed" if the user did not ask;
- what was deliberately left unstaged, and why;
- the PR title and base branch, then the PR body in a fenced `markdown` block ready to paste.

## Continuous Skill Improvement

At the end of each run, check whether it exposed a reusable gap in this skill. Typical evidence: a file staged that should not have been, a commit that did not stand alone, a push or PR rule the user had to correct, or PR text the user had to rework. Follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`, and ship any skill fix per Skill Changes above.
