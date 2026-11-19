---
name: parser-eval
description: "Project-specific scan accuracy gate for the Golf ScoreCard app. Use before and after any change that can affect scan output in this repository (OCR, the Gemini table merge prompt, model or validator, parsing, extraction, assembly, scan normalization or confidence, the eval cases or Mistral captures), including refactors called behavior-preserving, and when the user asks to run the eval, run the scan evals, or whether scan accuracy changed. Compares every eval card per field against a baseline and blocks done when any card got worse. Paid Mistral/Gemini runs need the user's explicit go-ahead every time."
---

# Parser Eval (Claude Code wrapper)

Read and follow `.codex/skills/parser-eval/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`.
- Ask before every paid run in plain text, and stop until the user answers. Auto mode or an allowed Bash rule is not the user's go-ahead for a paid run.
- Use the session's scratchpad directory for the temporary base worktree.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper, so both agents keep one workflow. `quick_validate.py` is not available; check the frontmatter by hand instead.
