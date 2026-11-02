---
name: implementation-plan
description: "Project-specific backend planning skill for the Golf ScoreCard app. Use after codebase-recon to turn a user's requested feature, bug fix, refactor, or test goal into a concrete written plan with expected files, implementation steps, test strategy, risks, and a mandatory user confirmation checkpoint."
---

# Implementation Plan (Claude Code wrapper)

Read and follow `.codex/skills/implementation-plan/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- Ask clarification and approval questions in plain text, and stop until the user answers. The confirmation gates are unchanged.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
