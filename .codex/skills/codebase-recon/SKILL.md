---
name: codebase-recon
description: Project-specific reconnaissance skill for the Golf ScoreCard app. Use as the first phase of make-code-change, or when the user wants a written map of likely files, code paths, tests, dependencies, and risks before planning or implementing a repository change.
---

# Codebase Recon

## Purpose

Inspect the Golf ScoreCard repository for the requested change and write the findings into the branch-named recon artifact. Do not modify application or test code during recon.

## Artifact

Create and own this artifact path defined by `$make-code-change`:

```text
.codex/change-artifacts/recon/<branch-slug>.md
```

Create the parent directory when needed. Start the file if it does not exist. Preserve existing user-authored notes if the file already exists.
Do not create or modify the implementation artifact.

## Recon Steps

1. Capture the current branch with `git branch --show-current`.
2. Check the worktree with `git status --short`; note unrelated dirty files and avoid touching them.
3. Read `AGENTS.md` if present and apply its repo guidance.
4. Search with `rg` and `rg --files` before broader commands.
5. Identify the likely implementation surface:
   - backend routers, services, repositories, models, migrations, or analytics
   - frontend pages, components, API client, types, styles, or accessibility helpers
   - LLM extraction prompts, strategies, confidence scoring, or tests
6. Identify the likely test surface:
   - existing `tests/test_*.py` targets for backend/model/LLM/service changes
   - frontend package checks or component tests if present
   - DB-dependent areas that may need mock repositories or isolated unit coverage
7. Note assumptions, unknowns, and possible blockers.
8. Decide whether any assumption, unknown, or implementation choice materially affects scope, behavior, structure, reliability, or review expectations.
9. If user direction is needed, finish the recon artifact, ask the clarification question immediately, and stop. Do not run `$implementation-plan` yet.
10. After the user answers, update the recon artifact so the resolution is explicit, then allow the parent workflow to proceed to planning.

Do not convert an unresolved question into a decision merely because one option seems preferable. Include a concise recommendation when useful, but wait for the user's answer. Do not ask about choices that are already answered by the request or dictated by the repository.

## Golf ScoreCard Map

Use these landmarks while investigating:

- `models/`: Pydantic domain models with optional fields for partial scanned data.
- `llm/`: Gemini scorecard extraction, prompts, strategies, confidence.
- `services/scan_service.py`: course resolution, clamping, hole score construction, user tee creation.
- `api/routers/`: FastAPI endpoints for scan, courses, rounds, users, and stats.
- `database/`: asyncpg repositories, converters, schema, migrations.
- `analytics/`: stats and goal report logic.
- `frontend/src/pages/`: app workflows for scan, courses, rounds, dashboard, suggestions.
- `frontend/src/lib/api.ts`: frontend API client.
- `frontend/src/types/`: scan and analytics types.

## Output Format

Write or update this section in the artifact:

```markdown
# <Change Title>

## Request
<Short restatement of the user's requested change.>

## Recon

### Likely Files
- `<path>`: <why it matters>

### Relevant Flow
<Brief explanation of how the touched code currently works.>

### Test Surface
- `<test path or command>`: <coverage purpose>

### Assumptions And Unknowns
- <item>

### Clarifications And Decisions
- <user-confirmed resolution, or "None needed">

### Risks Or Blockers
- <item>
```

Keep the recon specific enough to support planning, but avoid speculative implementation detail until the planning phase.
