---
name: implementation-plan
description: Project-specific planning skill for the Golf ScoreCard app. Use after codebase-recon to turn a user's requested feature, bug fix, refactor, or test goal into a concrete written plan with expected files, implementation steps, test strategy, risks, and a mandatory user confirmation checkpoint.
---

# Implementation Plan

## Purpose

Convert recon findings and the user's request into a practical implementation plan for this repository. Do not edit application or test code during this phase.

## Inputs

Read the branch-named artifact created by `$codebase-recon`:

```text
.codex/change-artifacts/<branch-slug>.md
```

If the recon section is missing, stop and run `$codebase-recon` first.

## Planning Rules

- Prefer the repository's existing patterns over new abstractions.
- Keep the blast radius narrow and name any intentional tradeoffs.
- Include tests as part of the plan, not as an afterthought.
- Include database migrations only when schema changes are required.
- Include frontend visual verification when changing meaningful UI behavior or layout.
- Ask the user concise clarification questions when implementation preferences affect the user experience, API contract, data model, test depth, rollout risk, or long-term maintainability.
- Avoid committing changes; final review and commits belong to the user.

## Clarification Checkpoint

Before writing the final plan, decide whether the recon leaves meaningful implementation choices unresolved. Ask the user for clarification when multiple reasonable paths exist and the choice would change behavior, structure, scope, or review expectations.

Good clarification topics include:

- user-facing behavior or UI flow
- API shape, request/response fields, or backward compatibility
- whether to favor a narrow fix or broader cleanup
- test coverage targets and whether mocks or integration tests are preferred
- persistence, migrations, and data backfill decisions
- performance, privacy, or reliability tradeoffs

Ask only the questions needed to plan responsibly. If the best path is clear from the codebase and user request, proceed without asking.

If clarification is needed, stop after asking and do not write the final `## Implementation Plan` section until the user answers. After the user answers, incorporate the decisions into the artifact and then ask for implementation approval.

## Project-Specific Testing Guidance

Use the smallest meaningful test set first, then broaden when risk warrants it:

- Python model/service/LLM logic: `python -m unittest <module-or-test>`.
- Existing LLM examples:
  - `python -m unittest tests.test_llm.TestScorecardExtraction.test_example_scorecard`
  - `python -m unittest tests.test_llm.TestScorecardExtraction.test_scores_only_extraction`
  - `python -m unittest tests.test_llm.TestScorecardExtraction.test_smart_with_null_repo`
- Frontend TypeScript/UI changes: inspect `frontend/package.json` and use existing scripts such as typecheck, lint, test, or build.
- DB repository behavior: prefer unit tests with mocks/fakes unless the change explicitly requires an integration database.

## Output Format

Append or replace this section in the artifact:

```markdown
## Implementation Plan

### Goal
<What will be true when this change is complete.>

### Planned Changes
- `<path>`: <specific planned edit>

### Test Plan
- `<command or test file>`: <what it proves>

### Acceptance Criteria
- <observable condition>

### Risks, Blockers, And Decisions
- <risk/blocker/decision>

### Out Of Scope
- <thing intentionally not being changed>
```

Then return a concise user-facing summary and ask exactly:

```text
Do you want me to implement this plan?
```

Stop after asking. Wait for explicit approval before implementation.
