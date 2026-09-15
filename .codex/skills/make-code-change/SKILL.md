---
name: make-code-change
description: "Project-specific orchestration workflow for the Golf ScoreCard app. Use when the user asks Codex to implement a complete feature, bug fix, refactor, or test change in this repository through a structured flow: codebase recon, written implementation plan, mandatory user confirmation, implementation loop, and unit test validation."
---

# Make Code Change

## Purpose

Use this parent skill to run a full, confirmation-gated code change in the Golf ScoreCard repository. Treat the sibling skills as equal instruction bundles and load them at the appropriate phase:

- `.codex/skills/codebase-recon/SKILL.md`
- `.codex/skills/implementation-plan/SKILL.md`
- `.codex/skills/implementation-loop/SKILL.md`

Skills do not execute each other automatically. As the agent, explicitly read the sibling skill file before starting each phase and follow its instructions.

## Artifacts

Create two Markdown artifacts for the change. Each phase owns its own file:

```text
.codex/change-artifacts/recon/<branch-slug>.md
.codex/change-artifacts/implementation/<branch-slug>.md
```

`$codebase-recon` creates the recon artifact. `$implementation-plan` reads the recon artifact and creates the implementation artifact. `$implementation-loop` reads both artifacts but does not modify either one.

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

If the branch is missing or unusable, use a short slug from the user request and note the fallback in both artifacts.

## Workflow

1. Clarify only if the requested change cannot be understood well enough to begin recon. Otherwise proceed.
2. Read and run `$codebase-recon`.
3. If recon identifies a material assumption, unknown, or choice that needs user direction, ask immediately and stop. After the user answers, update the recon artifact with the resolution before continuing.
4. Read and run `$implementation-plan`.
5. If planning identifies a new material choice that needs user direction, ask immediately and stop. After the user answers, update the implementation artifact with the resolution before continuing.
6. Stop and ask the user to confirm the completed plan. Do not edit application or test code before explicit approval.
7. After approval, read and run `$implementation-loop`.
8. End with a concise summary of changed files, tests run, residual risks, and both artifact paths. Do not commit.

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

Respect this repository's architecture:

- Backend: FastAPI, asyncpg, PostgreSQL schemas `courses` and `users`, Pydantic v2 models.
- Frontend: React, TypeScript, Vite, Tailwind CSS.
- LLM extraction: `llm/`, especially `scorecard_extractor.py`, `prompts.py`, `strategies.py`, and `confidence.py`.
- Business logic: `services/scan_service.py`.
- API request models: `api/request_models.py`.
- Tests: Python `unittest` under `tests/`; frontend checks through the `frontend` package scripts when relevant.

Do not make commits. Leave final review and commit decisions to the user.
