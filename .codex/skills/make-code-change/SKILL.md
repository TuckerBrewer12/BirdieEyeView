---
name: make-code-change
description: "Project-specific backend orchestration workflow for the Golf ScoreCard app. Use when the user asks Codex to implement a complete backend feature, bug fix, refactor, or test change in this repository through a structured flow: codebase recon, written implementation plan, mandatory user confirmation, implementation loop, E2E-first test validation, and docs update. A small, clear bug goes through bug-fix instead."
---

# Make Code Change

## Purpose

Use this parent skill to run a full, confirmation-gated backend code change in the Golf ScoreCard repository. Treat the sibling skills as equal instruction bundles and load them at the appropriate phase:

- `.codex/skills/codebase-recon/SKILL.md`
- `.codex/skills/implementation-plan/SKILL.md`
- `.codex/skills/implementation-loop/SKILL.md`
- `.codex/skills/update-docs/SKILL.md`

Supporting skills, read when a phase needs them: `$trace-impact` (who uses code before it changes or is called dead), `$api-contract-change` (a request or response model change), `$schema-migration` (a schema change) and `$parser-eval` (a change that can affect scan output).

Skills do not execute each other automatically. As the agent, explicitly read the sibling skill file before starting each phase and follow its instructions.

## Artifacts

Create two Markdown artifacts for the change. Each phase owns its own file:

```text
.codex/change-artifacts/recon/<branch-slug>.md
.codex/change-artifacts/implementation/<branch-slug>.md
```

`$codebase-recon` creates the recon artifact. `$implementation-plan` reads the recon artifact and creates the implementation artifact. `$implementation-loop` reads both artifacts and may only append approved entries to the implementation artifact's `### Plan Amendments` section.

Derive `<branch-slug>` from the current git branch:

1. Run `git branch --show-current`.
2. Remove common prefixes such as `codex/`, `feature/`, `fix/`, `bugfix/`, `chore/`, and `test/`.
3. Convert spaces, underscores, and slashes to hyphens.
4. Lowercase the result.
5. Remove a leading intent verb when present: `add-`, `create-`, `implement-`, `fix-`, `update-`, `refactor-`, or `test-`.

Example: branch `add scorecard unit test` produces:

```text
.codex/change-artifacts/recon/scorecard-unit-test.md
.codex/change-artifacts/implementation/scorecard-unit-test.md
```

When step 5 removed an intent verb, check for an existing artifact under the step 4 slug as well. Some older artifacts kept the verb (branch `codex/fix-scan-parser` has `fix-scan-parser.md`, not `scan-parser.md`). If only the step 4 form exists, reuse it as the `<branch-slug>` for both artifacts instead of creating a duplicate. If both forms exist, stop and ask the user which one to use.

If the branch is missing or unusable, use a short slug from the user request and note the fallback in both artifacts.

## Presenting Artifacts

Whenever recon or planning creates or updates an artifact, present the actual Markdown file to the user. In the Codex app, open it as a file with `open_in_codex` using the artifact's absolute path. Do not open or attach a review, diff, or changes view for an artifact. Also provide a direct clickable local-file link in the confirmation message. If the file-opening tool is unavailable, provide the direct file link without substituting a review link.

## Workflow

For one clear bug whose fix needs no contract, schema or product decision, use `$bug-fix` (`.codex/skills/bug-fix/SKILL.md`) instead. When `bug-fix` escalates here, its reproduction test and output are recon's first `### Reproduced` entry.

1. Clarify only if the requested change cannot be understood well enough to begin recon. Otherwise proceed.
2. Confirm the working branch before anything is named after it (see Working Branch).
3. Read and run `$codebase-recon`.
4. If recon identifies a material assumption, unknown, or choice that needs user direction, ask immediately and stop. After the user answers, update the recon artifact with the resolution before continuing. When the request names an area rather than a change ("refactor the courses router"), the scope recon proposes is such a choice: the user confirms which findings the change includes.
5. Read and run `$implementation-plan`.
6. If planning identifies a new material choice that needs user direction, ask immediately and stop. After the user answers, update the implementation artifact with the resolution before continuing.
7. Stop and ask the user to confirm the completed plan. Do not edit application or test code before explicit approval.
8. After approval, read and run `$implementation-loop`. If it stops for a plan amendment, get the user's approval before it continues.
9. When the change altered behavior, responsibilities, contracts, or source file locations described in `docs/`, `CLAUDE.md` or `AGENTS.md`, read and run `$update-docs` for the guides the plan and implementation named.
10. End with a concise summary of changed files, tests run, docs updated, residual risks, and both artifact paths. Offer to write the pull request description (see Pull Request Text). Do not commit unless the user asks.

Do not silently turn an unresolved recon or planning question into a decision. A recommended option may accompany the question, but the user's answer must be recorded before advancing to the next phase.

## Working Branch

The artifacts are named after the branch, so settle it first:

- Run `git branch --show-current` and `git status --short`.
- The change needs its own branch. If the current branch is `main`, an integration branch other work merges into (such as `backend-refactor` or a step's head branch), or a branch whose pull request has already merged, ask the user which base to branch from and what to name the branch, then create it. Bring the base up to date with its remote first (`git fetch`, then a fast-forward only).
- Do not switch branches over uncommitted work without the user's direction.
- Record the base branch and its commit at the top of the recon artifact.
- Check whether a branch has merged with `gh pr list --state merged --head <branch>`, not commit ancestry: this repository squash-merges some PRs (`backend-refactor` into `main` as #544), which leaves no ancestry.

## Review Follow-Ups

When a review (the user's, another agent's, or a pull request's) finds gaps after the loop has finished, re-enter the workflow instead of patching outside it:

1. Reproduce each finding and report which ones hold.
2. Treat the fixes as a plan amendment: get the user's approval, then append a dated entry to `### Plan Amendments` as `$implementation-loop` describes.
3. Run `$implementation-loop` for the amendment, including its Completion Review Loop and final gates, and `$update-docs` if the fixes change documented behavior.

## Pull Request Text

When the user asks for it, write it with `$ship-pr` (its PR Text section): the text goes in the reply for the user to paste. Do not open the pull request.

## Confirmation Gate

Clarification checkpoints during recon or planning are separate from the final confirmation gate. Ask them as soon as they are discovered instead of bundling them into final plan approval.

The final confirmation step is mandatory for every use of this skill. The response after planning must include:

- Both artifact paths.
- A short summary of the intended changes.
- Known blockers or risks.
- The exact question: `Do you want me to implement this plan?`

Wait for explicit approval before making code changes. Approval can be natural language such as "yes", "approved", "go ahead", or "looks good".

## Project Context

Respect this repository's backend architecture, described in `docs/architecture.md` and `docs/backend/`:

- Backend: FastAPI, asyncpg, PostgreSQL schemas `courses` and `users`, Pydantic v2 models.
- Scan extraction: `services/mistral_ocr_service.py`, `services/gemini_table_merger.py`, and `services/mistral_scorecard_parser.py`, orchestrated by `services/scan_ocr.py` and assembled in `services/scan_assembly.py`; `api/routers/scan.py` owns the HTTP side. The old `llm/` package is gone; do not follow references to it.
- Scan accuracy: a change in `$parser-eval`'s scope takes its baseline before the first edit and passes its comparison before it is done.
- Business logic: `services/scan_service.py` and the other `services/` workflows.
- API request models: `api/request_models.py` and `api/schemas.py`.
- Frontend contract: `frontend/openapi.json` and `frontend/src/types/api.gen.ts` are generated from the backend's response models, and CI fails when either is stale. The frontend owner maintains everything else under `frontend/`. `$api-contract-change` carries a model change through to them; contract-keeping frontend edits (types, mapping, fakes, fixtures) are part of the change, and using a new field in a page is the frontend owner's unless the user asks.
- Tests: Python pytest under `tests/`, including marked PostgreSQL integration tests under `tests/integration/`. Commands live in `docs/practices/testing.md`.

## Testing Priority

This is the single testing policy for every phase. Recon, planning, and the implementation loop apply it and do not restate it.

New coverage for a change is end-to-end first:

1. **E2E (default).** Prove any behavior reachable through the API in `tests/integration/test_api_e2e.py`: the real FastAPI app on the disposable PostgreSQL database, with only true external boundaries replaced (email, OCR and table-merge providers, report storage, external course search). Extend an existing E2E test when it already sets up the scenario.
2. **PostgreSQL integration.** Use it for SQL, constraint, transaction, and concurrency behavior the API cannot observe directly.
3. **Unit tests only when absolutely necessary.** Add one only when E2E cannot reasonably prove the behavior, and name the reason in the plan:
   - a pure rule with many boundary cases (analytics, handicap, parser, validation repeated across many request fields), where one request per case is impractical;
   - behavior the API cannot reach, such as CLI scripts, or parsing of provider output behind a paid call;
   - a failure path the real app and database cannot trigger (provider timeout, storage failure), faked at the true boundary;
   - a rule across the whole codebase that no single request can show, such as a guard that scans source files.

   Do not add a unit test that repeats what an E2E test proves, mirrors the implementation's structure, or exists to raise coverage. Existing unit tests broken by the change are updated, not rewritten as E2E by default.

Coverage gates: CI's total and changed-line coverage gates (`.github/workflows/tests.yml`) currently measure the unit suite only. If a change proven by E2E fails the changed-line gate, report it to the user and propose revising the gate. Never add filler unit tests to pass it.

Do not make commits unless the user asks; then run `$ship-pr`.

## Continuous Skill Improvement

This section holds the rules for improving any skill in this workflow. Each phase skill lists its own typical evidence and follows these rules.

At the end of every invocation, check whether this run exposed a reusable gap in the orchestration itself, rather than in a single phase. Typical evidence:

- A phase handoff lost information, or a phase started before its input artifact was ready.
- The artifact naming or reuse rule produced a duplicate or the wrong file.
- A confirmation gate was skipped, asked twice, or asked in the wrong place.

Gaps inside a single phase belong to that phase's skill. Misses outside any single phase (PR text, commits, tool behavior), fixes that belong in `AGENTS.md`, a check or memory, and the deliberate pass at the end of a pull request or after a user correction go through `$skill-retro`. When the evidence is concrete:

- Make the smallest correction to the responsible `SKILL.md` that would have prevented the problem. Fix a stale file path or landmark as soon as you confirm it.
- Keep the skill change separate from the user's task: make it as its own edit and list it under a separate "Skill changes" heading in the final response, with the evidence, so the user can review and commit it apart from the feature work.
- Do not add rules for application bugs, one-off tool or environment failures (a tool behavior that will recur, such as BSD `grep` lacking `\b`, is a fact for `AGENTS.md`), speculative edge cases, or preferences that apply only to the current task.
- Do not weaken confirmation gates, expand mutation authority, or materially change workflow scope without explicit user approval. Propose those changes instead.
- Preserve user-authored guidance and avoid duplicating rules already enforced elsewhere.
- Validate the modified skill with the skill-creator `quick_validate.py` script when available.

If no reusable gap appeared, leave the skills unchanged. Skill maintenance must not interrupt or replace completion of the user's primary task.
