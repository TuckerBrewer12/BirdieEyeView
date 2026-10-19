---
name: codebase-recon
description: Project-specific backend reconnaissance skill for the Golf ScoreCard app. Use as the first phase of make-code-change, or when the user wants a written map of likely files, code paths, tests, dependencies, and risks before planning or implementing a backend repository change.
---

# Codebase Recon

## Purpose

Inspect the Golf ScoreCard repository for the requested backend change and write the findings into the branch-named recon artifact. Do not modify application or test code during recon.

## Artifact

Create and own this artifact path defined by `$make-code-change`, including its rule for reusing an existing artifact:

```text
.codex/change-artifacts/recon/<branch-slug>.md
```

Create the parent directory when needed. Start the file if it does not exist. Preserve existing user-authored notes if the file already exists.
Do not create or modify the implementation artifact.

## Recon Steps

1. Capture the current branch with `git branch --show-current`.
2. Check the worktree with `git status --short`; note unrelated dirty files and avoid touching them.
3. Read `AGENTS.md` if present, then the relevant guides in `docs/`: start from `docs/backend/README.md` and read the guide for each backend domain the change touches.
4. Search with `rg` and `rg --files` before broader commands.
5. Identify the likely implementation surface:
   - API routers, request/response schemas, and dependencies
   - services, including the scan extraction pipeline and provider adapters
   - domain models, analytics, repositories, converters, schema, or migrations
6. Identify the likely test surface:
   - existing `tests/test_*.py` targets for the affected domains
   - DB-dependent areas: distinguish Python-only branching/conversion that can use unit fakes from SQL, constraint, ownership, transaction, and PostgreSQL-specific behavior that needs integration coverage
7. Note assumptions, unknowns, and possible blockers.
8. Decide whether any assumption, unknown, or implementation choice materially affects scope, behavior, structure, reliability, or review expectations.
9. If user direction is needed, finish the recon artifact, ask the clarification question immediately, and stop. Do not run `$implementation-plan` yet.
10. After the user answers, update the recon artifact so the resolution is explicit, then allow the parent workflow to proceed to planning.

Do not convert an unresolved question into a decision merely because one option seems preferable. Include a concise recommendation when useful, but wait for the user's answer. Do not ask about choices that are already answered by the request or dictated by the repository.

## Golf ScoreCard Map

Use these landmarks while investigating. The domain guides in `docs/backend/` are the maintained source; prefer them when they disagree with this list.

- `models/`: Pydantic domain models with optional fields for partial scanned data.
- `services/`: scan workflows and provider adapters. The active extraction pipeline is `mistral_ocr_service.py` (OCR), `gemini_table_merger.py` (optional table merging), and `mistral_scorecard_parser.py` (rows, players, hole columns); `scan_service.py` handles the reviewed-save workflow.
- `api/routers/`: FastAPI endpoints for auth, scan, scan reports, courses, rounds, users, stats, and AI insights. `scan.py` also assembles parsed extraction results.
- `database/`: asyncpg repositories, converters, schema, migrations.
- `analytics/`: stats, handicap, and goal report logic.

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

### Affected Docs
- `<docs path>`: <what may need updating>

### Assumptions And Unknowns
- <item>

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

When the evidence is concrete:

- Make the smallest correction to this `SKILL.md` that would have prevented the problem. Fix a stale landmark as soon as you confirm it.
- Keep the skill change separate from the user's task: make it as its own edit and list it under a separate "Skill changes" heading in the final response, with the evidence, so the user can review and commit it apart from the feature work.
- Do not add rules for application bugs, one-off tool or environment failures, speculative edge cases, or preferences that apply only to the current task.
- Do not weaken confirmation gates, expand mutation authority, or materially change workflow scope without explicit user approval. Propose those changes instead.
- Preserve user-authored guidance and avoid duplicating rules already enforced elsewhere.
- Validate the modified skill with the skill-creator `quick_validate.py` script when available.

If no reusable gap appeared, leave the skill unchanged. Skill maintenance must not interrupt or replace completion of the user's primary task.
