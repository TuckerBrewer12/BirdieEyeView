---
name: bug-fix
description: "Project-specific bug fix workflow for the Golf ScoreCard app. Use when the user reports a bug or an error in this repository (\"fix this bug\", \"this is broken\", \"X returns the wrong Y\", a traceback, a wrong status code or number) and the fix looks small and contained: reproduce it with a failing test, get the user's approval for the diagnosis and fix, make the smallest fix, show the test passes, and prove the test guards the fix with a mutation check. Bugs that need an API contract change, a schema change, or a choice between fixes go through make-code-change instead."
---

# Bug Fix (Claude Code wrapper)

Read and follow `.codex/skills/bug-fix/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- Ask the confirmation question in plain text, and stop until the user answers. The gate is unchanged.
- Use the session's scratchpad directory for the mutation check's file copies.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
