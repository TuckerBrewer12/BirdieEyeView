---
name: codebase-recon
description: "Project-specific backend reconnaissance skill for the Golf ScoreCard app. Use as the first phase of make-code-change, or when the user wants a written map of likely files, code paths, tests, dependencies, and risks before planning or implementing a backend repository change."
---

# Codebase Recon (Claude Code wrapper)

Read and follow `.codex/skills/codebase-recon/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- Ask clarification and approval questions in plain text, and stop until the user answers. The confirmation gates are unchanged.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
