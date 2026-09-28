---
name: implementation-loop
description: Project-specific implementation and test iteration skill for the Golf ScoreCard app. Use only after the user approves an implementation plan, to edit code, add unit tests, run focused validation, iterate on failures, and finish without committing.
---

# Implementation Loop

## Purpose

Implement the approved plan, add or update tests, run validation, and iterate until the requested change works cleanly. Use this only after explicit user approval of the branch-named implementation plan.

## Inputs

Read both branch-named artifacts:

```text
.codex/change-artifacts/recon/<branch-slug>.md
.codex/change-artifacts/implementation/<branch-slug>.md
```

Confirm the recon artifact contains `## Recon` and the implementation artifact contains `## Implementation Plan`. If approval is ambiguous or missing from the conversation, stop and ask for confirmation. Treat both artifacts as read-only during implementation.

## Implementation Loop

Repeat until the change meets the user's request and the acceptance criteria:

1. Select the next smallest coherent edit from the plan.
2. Read the target files and nearby tests before editing.
3. Edit with the repository's existing style and architecture.
4. Add or update unit tests covering the new or changed behavior.
5. Run the most focused relevant test/check.
6. If it fails, diagnose from the failure, make the smallest reasonable fix, and rerun.
7. Broaden validation when the changed surface is shared, user-facing, or cross-layer.
8. Keep the user updated with concise implementation progress and test results.

Do not commit. Do not revert unrelated dirty work.

## Completion Standard

The loop is complete when:

- The implementation satisfies the user's original request and the approved acceptance criteria.
- The code is clean, local to the planned surface, and consistent with existing patterns.
- Relevant unit tests have been added or updated.
- Focused tests/checks pass, or any inability to run them is clearly explained.
- The final response records what changed and what validation was run.

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

- Prefer focused pytest cases for Python logic and stable behavior contracts.
- Mock provider APIs and other true external boundaries. For database work, use fakes only for Python-side branching, conversion, or error translation; validate SQL, constraints, transactions, ownership filters, PostgreSQL types/extensions, and persistence round trips with the disposable PostgreSQL integration suite.
- For frontend, inspect `frontend/package.json` and run the available focused script first, then build/typecheck if appropriate.

## Final Response

Finish with:

- changed files
- tests/checks run and their result
- recon and implementation artifact paths
- residual risks or review notes

Keep it concise and do not ask whether to commit.

## Continuous Skill Improvement

At the end of every invocation, assess whether this skill's instructions caused or failed to prevent a demonstrated, reusable workflow problem.

- Improve this `SKILL.md` on the current working branch only when the current run provides concrete evidence and the correction is narrow, generalizable, and preserves the skill's purpose.
- Do not add rules for application bugs, one-off tool or environment failures, speculative edge cases, or a preference that applies only to the current task.
- Do not weaken confirmation gates, expand mutation authority, or materially change workflow scope without explicit user approval. Propose those changes instead.
- Make the smallest instruction change that would have prevented the observed problem, preserve user-authored guidance, and avoid duplicating rules already enforced elsewhere.
- Validate the modified skill with the skill-creator `quick_validate.py` script when available.
- Mention any skill change and the evidence for it in the final response. If no reusable gap appeared, leave the skill unchanged.

Skill maintenance must not interrupt or replace completion of the user's primary task.
