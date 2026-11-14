---
name: make-code-change
description: "Project-specific backend orchestration workflow for the Golf ScoreCard app. Use when the user asks to implement a complete backend feature, bug fix, refactor, or test change in this repository through a structured flow: codebase recon, written implementation plan, mandatory user confirmation, implementation loop, unit test validation, and docs update."
---

# Make Code Change (Claude Code wrapper)

Read and follow `.codex/skills/make-code-change/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- Ask clarification and approval questions in plain text, and stop until the user answers. The confirmation gates are unchanged.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
- `open_in_codex` does not exist here. Present each artifact as a clickable absolute file path instead, and never substitute a diff or review view.
