---
name: implementation-plan
description: Project-specific backend planning skill for the Golf ScoreCard app. Use after codebase-recon to turn a user's requested feature, bug fix, refactor, or test goal into a concrete written plan with expected files, implementation steps, test strategy, risks, and a mandatory user confirmation checkpoint.
---

# Implementation Plan

## Purpose

Convert recon findings and the user's request into a practical implementation plan for this repository. Do not edit application or test code during this phase.

## Inputs

Read the branch-named recon artifact created by `$codebase-recon`:

```text
.codex/change-artifacts/recon/<branch-slug>.md
```

If the recon section is missing, stop and run `$codebase-recon` first.

Create and own a separate implementation artifact:

```text
.codex/change-artifacts/implementation/<branch-slug>.md
```

Create the parent directory when needed. Preserve existing user-authored notes if the file already exists. Do not modify the recon artifact.

## Planning Rules

- Prefer the repository's existing patterns over new abstractions. `docs/practices/backend.md` records the intended layer responsibilities.
- Keep the blast radius narrow and name any intentional tradeoffs.
- Include tests as part of the plan, not as an afterthought.
- Include database migrations only when schema changes are required.
- Name the `docs/` guides the change will make inaccurate, so `$update-docs` can update them after implementation.
- Ask the user concise clarification questions when implementation preferences affect the API contract, data model, test depth, rollout risk, or long-term maintainability.
- Treat file organization, helper abstractions, dependency placement, CI job structure, testing-layer ownership, parameterization, and narrow-versus-broad cleanup as clarification topics when multiple reasonable choices would materially change the result.
- Do not record an unresolved preference as a decision. A recommended approach is not user confirmation.
- Do not repeat a question already answered in the request or recon artifact.
- Avoid committing changes; final review and commits belong to the user.

## Clarification Checkpoint

While writing the plan, decide whether the recon leaves meaningful implementation choices unresolved or whether planning reveals a new one. Ask the user immediately when multiple reasonable paths exist and the choice would change behavior, structure, scope, reliability, or review expectations.

Do not silently turn an unresolved implementation preference into a `Decision` in the plan. Before writing the plan, review every proposed item for `### Risks, Blockers, And Decisions` and classify it:

- Record it directly when the user already chose it, an established repository convention clearly dictates it, or safety/correctness leaves no reasonable alternative. State that basis in the plan when it is not obvious.
- Ask the user first when it represents the agent choosing among reasonable alternatives that would materially affect implementation or review.

This clarification requirement includes choices about:

- keeping existing files versus splitting or moving modules
- introducing a shared helper or abstraction versus keeping logic local
- narrow cleanup versus broader refactoring
- which testing layer owns a contract and what counts as redundant coverage
- parameterized cases versus separate named tests when that changes readability or reporting
- compatibility, rollout, persistence, performance, privacy, or reliability tradeoffs

The final approval question is not a substitute for clarification. Do not bury unresolved options in a completed plan and rely on the user to notice them during blanket approval.

Good clarification topics include:

- API shape, request/response fields, or backward compatibility
- whether to favor a narrow fix or broader cleanup
- test coverage targets and whether mocks or integration tests are preferred
- persistence, migrations, and data backfill decisions
- performance, privacy, or reliability tradeoffs

Ask only the questions needed to plan responsibly. If the best path is clear from the codebase and user request, proceed without asking. Final blanket approval of the plan is not a substitute for resolving a material implementation preference.

Do not repeat a question the user has already answered. When several unresolved choices are related, ask them together in a concise numbered list and explain the practical consequence of each option.

If clarification is needed, preserve the useful planning work already completed, mark the unresolved item clearly, and do not present the plan as final. Ask immediately and stop. After the user answers, update the implementation artifact with the user-confirmed decision, finish the plan, and then ask for implementation approval.

## Test Planning

Take test commands from `docs/practices/testing.md`, which is the maintained source; do not copy commands from memory or older notes. Plan the smallest meaningful test set first, then broaden when the change crosses domains. Choose the layer by what the test must prove:

- Python branching, conversion, or error translation: focused unit tests with fakes.
- SQL, constraints, ownership filters, transactions, PostgreSQL types/extensions, and persistence round trips: the disposable PostgreSQL integration suite, not mocked asyncpg execution.
- Live scan evaluation calls paid providers; plan it only when the task needs it.

## Output Format

Write or update this content in the implementation artifact:

```markdown
# <Change Title>

## Implementation Plan

### Goal
<What will be true when this change is complete.>

### Planned Changes
- `<path>`: <specific planned edit>

### Test Plan
- `<command or test file>`: <what it proves>

### Docs To Update
- `<docs path>`: <what will become inaccurate, or "None">

### Acceptance Criteria
- <observable condition>

### Risks, Blockers, And Decisions
- <risk/blocker/decision>

### Out Of Scope
- <thing intentionally not being changed>

### Plan Amendments
<Empty at approval. `$implementation-loop` appends approved changes here.>
```

Then return a concise user-facing summary and ask exactly:

```text
Do you want me to implement this plan?
```

Stop after asking. Wait for explicit approval before implementation.

## Continuous Skill Improvement

At the end of every invocation, check whether this planning run exposed a reusable gap in this skill. Typical evidence:

- A material choice reached the plan as a `Decision` without the user confirming it.
- Implementation later needed a plan amendment that planning should have anticipated.
- The test plan named a command, file, or layer that turned out to be wrong.

When the evidence is concrete:

- Make the smallest correction to this `SKILL.md` that would have prevented the problem.
- Keep the skill change separate from the user's task: make it as its own edit and list it under a separate "Skill changes" heading in the final response, with the evidence, so the user can review and commit it apart from the feature work.
- Do not add rules for application bugs, one-off tool or environment failures, speculative edge cases, or preferences that apply only to the current task.
- Do not weaken confirmation gates, expand mutation authority, or materially change workflow scope without explicit user approval. Propose those changes instead.
- Preserve user-authored guidance and avoid duplicating rules already enforced elsewhere.
- Validate the modified skill with the skill-creator `quick_validate.py` script when available.

If no reusable gap appeared, leave the skill unchanged. Skill maintenance must not interrupt or replace completion of the user's primary task.
