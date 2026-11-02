---
name: make-code-change
description: "Project-specific backend orchestration workflow for the Golf ScoreCard app. Use when the user asks Codex to implement a complete backend feature, bug fix, refactor, or test change in this repository through a structured flow: codebase recon, written implementation plan, mandatory user confirmation, implementation loop, unit test validation, and docs update."
---

# Make Code Change

## Purpose

Use this parent skill to run a full, confirmation-gated backend code change in the Golf ScoreCard repository. Treat the sibling skills as equal instruction bundles and load them at the appropriate phase:

- `.codex/skills/codebase-recon/SKILL.md`
- `.codex/skills/implementation-plan/SKILL.md`
- `.codex/skills/implementation-loop/SKILL.md`
- `.codex/skills/update-docs/SKILL.md`

Skills do not execute each other automatically. As the agent, explicitly read the sibling skill file before starting each phase and follow its instructions.

## Artifacts

Create two Markdown artifacts for the change. Each phase owns its own file:

```text
.codex/change-artifacts/recon/<branch-slug>.md
.codex/change-artifacts/implementation/<branch-slug>.md
```

`$codebase-recon` creates the recon artifact. `$implementation-plan` reads the recon artifact and creates the implementation artifact. `$implementation-loop` reads both artifacts and may only append approved entries to the implementation artifact's `### Plan Amendments` section.

## Presenting Artifacts

Whenever recon or planning creates or updates an artifact, present the actual Markdown file to the user. In the Codex app, open it as a file with `open_in_codex` using the artifact's absolute path. Do not open or attach a review, diff, or changes view for an artifact. Also provide a direct clickable local-file link in the confirmation message. If the file-opening tool is unavailable, provide the direct file link without substituting a review link.

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

## Workflow

1. Clarify only if the requested change cannot be understood well enough to begin recon. Otherwise proceed.
2. Read and run `$codebase-recon`.
3. If recon identifies a material assumption, unknown, or choice that needs user direction, ask immediately and stop. After the user answers, update the recon artifact with the resolution before continuing.
4. Read and run `$implementation-plan`.
5. If planning identifies a new material choice that needs user direction, ask immediately and stop. After the user answers, update the implementation artifact with the resolution before continuing.
6. Stop and ask the user to confirm the completed plan. Do not edit application or test code before explicit approval.
7. After approval, read and run `$implementation-loop`. If it stops for a plan amendment, get the user's approval before it continues.
8. When the change altered behavior, responsibilities, contracts, or source file locations described in `docs/`, read and run `$update-docs` for the guides the plan and implementation named.
9. End with a concise summary of changed files, tests run, docs updated, residual risks, and both artifact paths. Do not commit.

Do not silently turn an unresolved recon or planning question into a decision. A recommended option may accompany the question, but the user's answer must be recorded before advancing to the next phase.

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
- Scan extraction: `services/mistral_ocr_service.py`, `services/gemini_table_merger.py`, and `services/mistral_scorecard_parser.py`, assembled in `api/routers/scan.py`. The old `llm/` package is gone; do not follow references to it.
- Business logic: `services/scan_service.py` and the other `services/` workflows.
- API request models: `api/request_models.py` and `api/schemas.py`.
- Tests: Python pytest under `tests/`, including marked PostgreSQL integration tests under `tests/integration/`. Commands live in `docs/practices/testing.md`.

Do not make commits. Leave final review and commit decisions to the user.

## Continuous Skill Improvement

At the end of every invocation, check whether this run exposed a reusable gap in the orchestration itself, rather than in a single phase. Typical evidence:

- A phase handoff lost information, or a phase started before its input artifact was ready.
- The artifact naming or reuse rule produced a duplicate or the wrong file.
- A confirmation gate was skipped, asked twice, or asked in the wrong place.

Gaps inside a single phase belong to that phase's skill. When the evidence is concrete:

- Make the smallest correction to the responsible `SKILL.md` that would have prevented the problem.
- Keep the skill change separate from the user's task: make it as its own edit and list it under a separate "Skill changes" heading in the final response, with the evidence, so the user can review and commit it apart from the feature work.
- Do not add rules for application bugs, one-off tool or environment failures, speculative edge cases, or preferences that apply only to the current task.
- Do not weaken confirmation gates, expand mutation authority, or materially change workflow scope without explicit user approval. Propose those changes instead.
- Preserve user-authored guidance and avoid duplicating rules already enforced elsewhere.
- Validate the modified skill with the skill-creator `quick_validate.py` script when available.

If no reusable gap appeared, leave the skills unchanged. Skill maintenance must not interrupt or replace completion of the user's primary task.
