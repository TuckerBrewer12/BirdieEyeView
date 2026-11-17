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
- Name the `docs/` guides the change will make inaccurate, and the `CLAUDE.md`/`AGENTS.md` bullets, so `$update-docs` can update them after implementation.
- When a response or request model changes, plan the regeneration of `frontend/openapi.json` and `api.gen.ts` and say what the frontend owner needs to know.
- Resolve material implementation preferences with the user before finishing the plan (see Clarification Checkpoint). A recommended approach is not user confirmation.
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
- API shape, request/response fields, or backward compatibility
- migrations and data backfill decisions

The final approval question is not a substitute for clarification. Do not bury unresolved options in a completed plan and rely on the user to notice them during blanket approval.

Ask only the questions needed to plan responsibly. If the best path is clear from the codebase and user request, proceed without asking. When several unresolved choices are related, ask them together in a concise numbered list and explain the practical consequence of each option.

If clarification is needed, preserve the useful planning work already completed, mark the unresolved item clearly, and do not present the plan as final. Ask immediately and stop. After the user answers, update the implementation artifact with the user-confirmed decision, finish the plan, and then ask for implementation approval.

## Test Planning

Take test commands from `docs/practices/testing.md`, which is the maintained source; do not copy commands from memory or older notes. Choose layers by the Testing Priority in `.codex/skills/make-code-change/SKILL.md`: E2E first, PostgreSQL integration for what the API cannot observe, and unit tests only when absolutely necessary. Plan the smallest meaningful test set, and list the final gates the loop will run (the full unit and integration suites and the checks in `docs/practices/testing.md`).

In the Test Plan, name each new test and its layer. For every new unit test, state which necessity reason from the Testing Priority applies; a unit test without one does not belong in the plan. Live scan evaluation calls paid providers; plan it only when the task needs it.

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
- `<docs path, CLAUDE.md/AGENTS.md bullet, or handoff.md entry>`: <what will become inaccurate, or "None">

### Frontend Impact
<None, or: regenerated types, changed responses or errors, and what the frontend owner needs to do.>

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

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`: the smallest correction, kept separate from the user's task and listed under "Skill changes", with no weakened gates. If no reusable gap appeared, leave the skill unchanged.
