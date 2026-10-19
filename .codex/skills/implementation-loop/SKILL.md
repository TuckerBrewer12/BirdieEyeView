---
name: implementation-loop
description: Project-specific backend implementation and test iteration skill for the Golf ScoreCard app. Use only after the user approves an implementation plan, to edit code, add unit tests, run focused validation, iterate on failures, and finish without committing.
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

Confirm the recon artifact contains `## Recon` and the implementation artifact contains `## Implementation Plan`. If approval is ambiguous or missing from the conversation, stop and ask for confirmation.

Treat the recon artifact as read-only. Treat the implementation artifact as read-only except for appending approved entries to its `### Plan Amendments` section (see below).

## Implementation Loop

Repeat until the change meets the user's request and the acceptance criteria:

1. Select the next smallest coherent edit from the plan.
2. Read the target files and nearby tests before editing.
3. Edit with the repository's existing style and architecture.
4. Add or update unit tests covering the new or changed behavior.
5. Run the most focused relevant test/check.
6. If it fails, diagnose from the failure, make the smallest reasonable fix, and rerun.
7. Broaden validation when the changed surface is shared or cross-layer.
8. Keep the user updated with concise implementation progress and test results.

Do not commit. Do not revert unrelated dirty work.

## When The Plan Is Wrong

Stop before departing from the approved plan when you find that the change needs any of:

- files or domains the plan did not name
- different behavior, API/request/response contracts, persistence, or migrations
- a different testing layer or weaker coverage than the Test Plan
- changed acceptance criteria or out-of-scope items

When that happens:

1. Stop editing in the affected area. Work that does not depend on the change may continue.
2. Tell the user what you found, the evidence, and the proposed amendment, with its consequence.
3. Wait for explicit approval, as for the original plan.
4. After approval, append a dated entry to `### Plan Amendments` in the implementation artifact: what changed, why, and that the user approved it. Then continue.

Small mechanical deviations inside the planned surface, such as an extra import, a private helper in a planned file, or a renamed test, do not need approval. List them in the final response.

## Completion Standard

The loop is complete when:

- The implementation satisfies the user's original request and the approved acceptance criteria, including any approved amendments.
- The code is clean, local to the planned surface, and consistent with existing patterns.
- Relevant unit tests have been added or updated.
- Focused tests/checks pass, or any inability to run them is clearly explained.
- The final response records what changed and what validation was run.

## Project-Specific Guidance

Follow the layer responsibilities in `docs/practices/backend.md`. In particular:

- Keep domain validation in `models/` and request/response shape in `api/request_models.py` and `api/schemas.py`.
- Keep business logic in `services/` when it would otherwise crowd routers.
- Keep async database behavior in repositories and row/model conversion in `database/converters.py`.
- Clamp unreliable scan values before constructing strict Pydantic models, following `services/scan_service.py`.

Take test and lint commands from `docs/practices/testing.md`; do not copy them from memory or older notes. Mock provider APIs and other true external boundaries. For database work, use fakes only for Python-side branching, conversion, or error translation; validate SQL, constraints, transactions, ownership filters, PostgreSQL types/extensions, and persistence round trips with the disposable PostgreSQL integration suite.

## Final Response

Finish with:

- changed files
- tests/checks run and their result
- plan amendments and small deviations, if any
- `docs/` guides the change made inaccurate
- recon and implementation artifact paths
- residual risks or review notes

Keep it concise and do not ask whether to commit.

## Continuous Skill Improvement

At the end of every invocation, check whether this implementation run exposed a reusable gap in this skill. Typical evidence:

- The plan needed an amendment that the rules above did not cover, or the amendment process caused friction.
- Validation guidance pointed to the wrong command, layer, or source.
- A recurring failure pattern took several iterations that a short rule would have avoided.

When the evidence is concrete:

- Make the smallest correction to this `SKILL.md` that would have prevented the problem.
- Keep the skill change separate from the user's task: make it as its own edit and list it under a separate "Skill changes" heading in the final response, with the evidence, so the user can review and commit it apart from the feature work.
- Do not add rules for application bugs, one-off tool or environment failures, speculative edge cases, or preferences that apply only to the current task.
- Do not weaken confirmation gates, expand mutation authority, or materially change workflow scope without explicit user approval. Propose those changes instead.
- Preserve user-authored guidance and avoid duplicating rules already enforced elsewhere.
- Validate the modified skill with the skill-creator `quick_validate.py` script when available.

If no reusable gap appeared, leave the skill unchanged. Skill maintenance must not interrupt or replace completion of the user's primary task.
