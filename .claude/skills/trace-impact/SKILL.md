---
name: trace-impact
description: "Project-specific impact tracing skill for the Golf ScoreCard app. Use before changing, moving, renaming or deleting code, a file, a DB column, an endpoint, a request or response field, or an env setting, and before claiming that something is dead, unused, only used by X, what the API sends or the app sends, or what a change affects. Triggers on \"is this used\", \"safe to delete\", \"who calls\", \"what does this affect\", moving or renaming code, and codebase-recon findings. Finds every reference across all files git knows and traces runtime reach end to end, labelling each claim verified or unverified."
---

# Trace Impact (Claude Code wrapper)

Read and follow `.codex/skills/trace-impact/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- The Grep tool is ripgrep and skips hidden folders (`.github/`, `.codex/`) unless told otherwise. Run the skill's `git grep` commands through Bash instead.
- Run the skill's Python scripts through Bash from the repository root. In a worktree under `.claude/worktrees/` there is no `.venv`; use the main checkout's `.venv/bin/python`.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
