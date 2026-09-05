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

## Artifact

Create and maintain one Markdown artifact for the change:

```text
.codex/change-artifacts/<branch-slug>.md
```

Derive `<branch-slug>` from the current git branch:

1. Run `git branch --show-current`.
2. Remove common prefixes such as `codex/`, `feature/`, `fix/`, `bugfix/`, `chore/`, and `test/`.
3. Convert spaces, underscores, and slashes to hyphens.
4. Lowercase the result.
5. Remove a leading intent verb when present: `add-`, `create-`, `implement-`, `fix-`, `update-`, `refactor-`, or `test-`.

Example: branch `add scorecard unit test` becomes `.codex/change-artifacts/scorecard-unit-test.md`.

If the branch is missing or unusable, use a short slug from the user request and note the fallback in the artifact.

## Workflow

1. Clarify only if the requested change cannot be understood well enough to begin recon. Otherwise proceed.
2. Read and run `$codebase-recon`.
3. Read and run `$implementation-plan`.
4. Stop and ask the user to confirm the plan. Do not edit application or test code before explicit approval.
5. After approval, read and run `$implementation-loop`.
6. End with a concise summary of changed files, tests run, residual risks, and the artifact path. Do not commit.

## Confirmation Gate

The confirmation step is mandatory for every use of this skill. The response after planning must include:

- The artifact path.
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
