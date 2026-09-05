---
name: implementation-loop
description: Project-specific implementation and test iteration skill for the Golf ScoreCard app. Use only after the user approves an implementation plan, to edit code, add unit tests, run focused validation, iterate on failures, and finish without committing.
---

# Implementation Loop

## Purpose

Implement the approved plan, add or update tests, run validation, and iterate until the requested change works cleanly. Use this only after explicit user approval of the branch-named implementation plan.

## Inputs

Read the branch-named artifact:

```text
.codex/change-artifacts/<branch-slug>.md
```

Confirm it contains both `## Recon` and `## Implementation Plan`. If approval is ambiguous or missing from the conversation, stop and ask for confirmation.

## Implementation Loop

Repeat until the change meets the user's request and the acceptance criteria:

1. Select the next smallest coherent edit from the plan.
2. Read the target files and nearby tests before editing.
3. Edit with the repository's existing style and architecture.
4. Add or update unit tests covering the new or changed behavior.
5. Run the most focused relevant test/check.
6. If it fails, diagnose from the failure, make the smallest reasonable fix, and rerun.
7. Broaden validation when the changed surface is shared, user-facing, or cross-layer.
8. Update the artifact with implementation notes and test results.

Do not commit. Do not revert unrelated dirty work.

## Completion Standard

The loop is complete when:

- The implementation satisfies the user's original request and the approved acceptance criteria.
- The code is clean, local to the planned surface, and consistent with existing patterns.
- Relevant unit tests have been added or updated.
- Focused tests/checks pass, or any inability to run them is clearly explained.
- The artifact records what changed and what validation was run.

## Project-Specific Guidance

Backend:

- Keep domain validation in `models/` and request/response shape in `api/request_models.py`.
- Keep business logic in `services/` when it would otherwise crowd routers.
- Keep async database behavior in repositories and row/model conversion in `database/converters.py`.
- Clamp unreliable scan values before constructing strict Pydantic models, following `services/scan_service.py`.

Frontend:

- Match existing React, TypeScript, Vite, and Tailwind conventions.
- Use `frontend/src/lib/api.ts` for API calls and shared types in `frontend/src/types/`.
- Follow the UI design system in `AGENTS.md` for visual changes.
- Verify meaningful UI changes with a browser/dev-server workflow when feasible.

Tests:

- Prefer focused `unittest` cases for Python logic.
- Use mocks/fakes for LLM, DB, and external services unless an integration test is explicitly needed.
- For frontend, inspect `frontend/package.json` and run the available focused script first, then build/typecheck if appropriate.

## Artifact Update

Append or update:

```markdown
## Implementation Notes
- `<path>`: <what changed>

## Validation
- `<command>`: <pass/fail and key result>

## Final Review Notes
- <anything the user should look at during their final code review>
```

## Final Response

Finish with:

- changed files
- tests/checks run and their result
- artifact path
- residual risks or review notes

Keep it concise and do not ask whether to commit.
