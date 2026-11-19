---
name: skill-retro
description: "Project-specific retrospective skill for the Golf ScoreCard app. Use at the end of a piece of work or a pull request, after the user corrects the agent in this repository, or when the user asks for a retro, \"what should we change in the skills\", or to \"update the skill after this\". Turns each correction or miss into the smallest durable fix in the right place (a check, AGENTS.md and CLAUDE.md, a workflow skill, or the agent's memory) and proposes the list for approval before applying anything."
---

# Skill Retro (Claude Code wrapper)

Read and follow `.codex/skills/skill-retro/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before starting the phase. The matching wrapper in `.claude/skills/` only points back to it.
- Ask clarification and approval questions in plain text, and stop until the user answers. The confirmation gates are unchanged.
- "The agent's memory" is Claude Code's auto-memory: the `MEMORY.md` index and its entry files in the project memory directory. Check it in Collect and Route.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
