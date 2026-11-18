---
name: codebase-recon
description: Project-specific backend reconnaissance skill for the Golf ScoreCard app. Use as the first phase of make-code-change, or when the user wants a written map of likely files, code paths, tests, dependencies, and risks before planning or implementing a backend repository change.
---

# Codebase Recon

## Purpose

Inspect the Golf ScoreCard repository for the requested backend change and write the findings into the branch-named recon artifact. Do not modify application or test code during recon; the one exception is a throwaway probe (see Reproducing Behavior).

## Artifact

Create and own this artifact path defined by `$make-code-change`, including its rule for reusing an existing artifact:

```text
.codex/change-artifacts/recon/<branch-slug>.md
```

Create the parent directory when needed. Start the file if it does not exist. Preserve existing user-authored notes if the file already exists.
Do not create or modify the implementation artifact.

## Recon Steps

1. Capture the current branch with `git branch --show-current` and its base (the Working Branch section of `$make-code-change`); record both at the top of the artifact.
2. Check the worktree with `git status --short`; note unrelated dirty files and avoid touching them.
3. Read `AGENTS.md` if present, then the relevant guides in `docs/`: start from `docs/backend/README.md` and read the guide for each backend domain the change touches. Read `handoff.md` and earlier artifacts for the same workstream when they exist; they carry deferred items and decisions already made. They are local notes, so check a claim against the code before relying on it.
4. Search with `rg` and `rg --files` before broader commands. When finding a module's or function's callers, match whole words with `rg -w` or `grep -w`, never `\b` in `git grep -E` or BSD `grep -E` (it silently matches nothing on macOS). Include relative imports (`from .stats import`) and module aliases (`from analytics import stats as analytics`) as well as the dotted path.
5. Identify the likely implementation surface:
   - API routers, request/response schemas, and dependencies
   - services, including the scan extraction pipeline and provider adapters
   - domain models, analytics, repositories, converters, schema, or migrations
6. Find who calls the touched endpoints: `frontend/src/lib/api.ts` and its callers under `frontend/src/`, plus scripts and tests. Record which routes the frontend uses and what it sends, whether the change needs a frontend change, and whether it alters the OpenAPI schema (`frontend/openapi.json` and `api.gen.ts` would be regenerated).
7. Reproduce suspected defects instead of inferring them from reading (see Reproducing Behavior).
8. Identify the likely test surface, following the Testing Priority in `.codex/skills/make-code-change/SKILL.md`:
   - existing E2E scenarios in `tests/integration/test_api_e2e.py` the change touches or can extend
   - existing `tests/test_*.py` targets for the affected domains
   - DB-dependent areas: distinguish Python-only branching/conversion that can use unit fakes from SQL, constraint, ownership, transaction, and PostgreSQL-specific behavior that needs integration coverage
9. Note assumptions, unknowns, and possible blockers.
10. Decide whether any assumption, unknown, or implementation choice materially affects scope, behavior, structure, reliability, or review expectations. A behavior change the user did not ask for is such a choice, even when it looks like the obvious fix. When the request names an area rather than a change, list the proposed scope (each finding: include, or leave out and why) for the user to confirm.
11. If user direction is needed, finish the recon artifact, ask the clarification question immediately, and stop. Do not run `$implementation-plan` yet.
12. After the user answers, update the recon artifact so the resolution is explicit, then allow the parent workflow to proceed to planning.

Do not convert an unresolved question into a decision merely because one option seems preferable. Include a concise recommendation when useful, but wait for the user's answer. Do not ask about choices that are already answered by the request or dictated by the repository.

## Reproducing Behavior

A finding that the code misbehaves needs evidence. Prefer a throwaway probe against the disposable PostgreSQL database: a temporary test file that reuses the `api` fixture and helpers from `tests/integration/test_api_e2e.py`, sends the real requests (the frontend's actual payload when the frontend is the caller), and prints what comes back.

- Name it so it cannot be mistaken for a real test (`tests/integration/test_zz_probe_<slug>.py`) and delete it before recon ends. `git status --short` must show no probe file when you finish.
- Never call paid providers or a non-test database from a probe.
- Record each result in the artifact's `### Reproduced` table. A suspicion you could not reproduce is listed as unverified, not as a finding.

## Golf ScoreCard Map

Use these landmarks while investigating. The domain guides in `docs/backend/` are the maintained source; prefer them when they disagree with this list.

- `models/`: Pydantic domain models with optional fields for partial scanned data.
- `services/`: workflows and provider adapters. The active extraction pipeline is `mistral_ocr_service.py` (OCR), `gemini_table_merger.py` (optional table merging), and `mistral_scorecard_parser.py` (rows, players, hole columns), run by `scan_ocr.py` and assembled into round payloads by `scan_assembly.py`; `scan_service.py` handles the reviewed-save workflow.
- `api/routers/`: FastAPI endpoints for auth, scan, scan reports, courses, rounds, users, stats, and AI insights. Routers check access and map errors; response assembly lives in the `api/*_responses.py` builders.
- `database/`: asyncpg repositories, converters, schema, migrations.
- `analytics/`: stats, handicap, and goal report logic.

## Output Format

Write or update this section in the artifact:

```markdown
# <Change Title>

## Request
<Short restatement of the user's requested change.>

> Branch `<branch>` from `<base branch>` at `<commit>`.

## Recon

### Callers
<Which frontend screens, scripts or tests call the touched endpoints, and whether the OpenAPI schema changes.>

### Reproduced
| Request | Result |
|---|---|
| <what was sent> | <what came back, or "unverified"> |

### Likely Files
- `<path>`: <why it matters>

### Relevant Flow
<Brief explanation of how the touched code currently works.>

### Test Surface
- `<test path or command>`: <coverage purpose>

### Affected Docs
- `<docs path>`: <what may need updating>

### Assumptions And Unknowns
- <item>

### Proposed Scope
- <finding>: <include, or leave out and why>

### Clarifications And Decisions
- <user-confirmed resolution, or "None needed">

### Risks Or Blockers
- <item>
```

Keep the recon specific enough to support planning, but avoid speculative implementation detail until the planning phase.

## Continuous Skill Improvement

At the end of every invocation, check whether this recon run exposed a reusable gap in this skill. Typical evidence:

- A landmark in the map above was missing, renamed, or no longer accurate.
- Planning or implementation later needed a file, test, or risk that recon should have found.
- Recon asked a clarification question the repository already answered, or skipped one that changed the plan.
- A finding recorded without reproduction turned out to be wrong, or a probe file was left behind.

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`: the smallest correction, kept separate from the user's task and listed under "Skill changes", with no weakened gates. If no reusable gap appeared, leave the skill unchanged.
