---
name: update-docs
description: "Project-specific documentation skill for the Golf ScoreCard app. Use after make-code-change implements a backend change, or when the user asks to bring the docs/ guides up to date with code changes, to update the affected architecture, backend domain, practices, and operations guides without touching application code."
---

# Update Docs (Claude Code wrapper)

Read and follow `.codex/skills/update-docs/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- Ask clarification and approval questions in plain text, and stop until the user answers. The confirmation gates are unchanged.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
