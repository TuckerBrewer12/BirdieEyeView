---
name: implementation-loop
description: "Project-specific backend implementation and test iteration skill for the Golf ScoreCard app. Use only after the user approves an implementation plan, to edit code, add unit tests, run focused validation, iterate on failures, and finish without committing."
---

# Implementation Loop (Claude Code wrapper)

Read and follow `.codex/skills/implementation-loop/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- Ask clarification and approval questions in plain text, and stop until the user answers. The confirmation gates are unchanged.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
