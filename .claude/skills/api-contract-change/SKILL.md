---
name: api-contract-change
description: "Project-specific API contract workflow for the Golf ScoreCard app. Use when a change adds, removes, renames or retypes a field on an API request or response model (api/schemas.py, api/request_models.py, a response_model), changes an endpoint's shape, status code or error body, when the user asks to regenerate the types (frontend/openapi.json, api.gen.ts), or when the OpenAPI schema and the frontend have drifted or CI reports either generated file stale. Classifies the change for API clients, regenerates the schema and TypeScript types, updates every frontend use and fake, and runs both sides' checks so backend and frontend never drift."
---

# API Contract Change (Claude Code wrapper)

Read and follow `.codex/skills/api-contract-change/SKILL.md`. That file is the single source of truth for this workflow; this wrapper only makes it discoverable in Claude Code.

Differences for Claude Code:

- `$<skill-name>` means `.codex/skills/<skill-name>/SKILL.md`; read that file before using it.
- Ask for approval of a breaking change in plain text, and stop until the user answers.
- Use the session's scratchpad directory for any throwaway script; never leave one in the repository.
- Apply any "Continuous Skill Improvement" edits to the `.codex/skills/` file, never to this wrapper. `quick_validate.py` is not available; check the frontmatter by hand instead.
