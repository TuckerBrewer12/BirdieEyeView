---
name: ship-pr
description: "Project-specific commit, push and pull request text workflow for the Golf ScoreCard app. Use only when the user explicitly asks to commit, push, \"commit and push\", or write the PR description or PR text for a change in this repository. Stages explicit paths, splits commits when the plan says so, pushes the branch, and writes the PR description for the user to paste. Never opens a pull request."
---

# Ship PR (Claude Code wrapper)

Read and follow `.codex/skills/ship-pr/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- The attribution line for commits is the `Co-Authored-By:` line in the session's system instructions; use exactly that one.
- Use the session's scratchpad directory for patches and temporary worktrees.
- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper. `quick_validate.py` is not available; check the frontmatter by hand instead.
