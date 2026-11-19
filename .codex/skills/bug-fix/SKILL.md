---
name: bug-fix
description: "Project-specific bug fix workflow for the Golf ScoreCard app. Use when the user reports a bug or an error in this repository (\"fix this bug\", \"this is broken\", \"X returns the wrong Y\", a traceback, a wrong status code or number) and the fix looks small and contained: reproduce it with a failing test, get the user's approval for the diagnosis and fix, make the smallest fix, show the test passes, and prove the test guards the fix with a mutation check. Bugs that need an API contract change, a schema change, or a choice between fixes go through make-code-change instead."
---

# Bug Fix

## Purpose

Fix one clear, contained bug with proof: a test that fails before the fix for the right reason, passes after it for the right reason, and fails again when the fix is reverted. This is the lighter sibling of `$make-code-change` (`.codex/skills/make-code-change/SKILL.md`): no recon or plan artifacts, but the same Testing Priority, a confirmation gate before the fix, and the same Final Gates and Completion Review Loop before reporting done.

## When To Use It

Use `bug-fix` when all of these hold:

- One behavior is wrong, and what it should be is clear from the code, `docs/`, or the user's report.
- Once reproduced, the fix is obvious and small, in the code that owns the rule.
- The fix changes no API contract (no field, type, model or OpenAPI schema change; no status code or behavior the frontend relies on), no database schema or migration, and needs no product decision.

Escalate to `$make-code-change` when reproduction shows any of:

- the fix would change the OpenAPI schema (`scripts/dump_openapi.py --check` would fail), a request or response shape, or a behavior a frontend caller relies on (`frontend/src/lib/api.ts` and its callers);
- the fix needs a schema change, a migration, or a data backfill;
- there are several reasonable fixes with different behavior, and the user has to choose;
- the cause is a design problem, or the fix spreads across domains or beyond the code that owns the rule;
- the "bug" is the behavior `docs/` describes, so the request is really a change.

To escalate: stop before editing application code, tell the user what the reproduction showed and which trigger applies, and on their go-ahead start `$make-code-change`. Keep the reproduction test and its output: they are the recon artifact's first `### Reproduced` entry.

When the cause is in `frontend/` (other than the generated `frontend/openapi.json` and `api.gen.ts`), report it for the frontend owner instead of fixing it. Scan-accuracy bugs (a wrong value read from a scorecard) reproduce offline with the Mistral-capture scenarios in `tests/integration/test_api_e2e.py`; use `$parser-eval` (`.codex/skills/parser-eval/SKILL.md`) for evals, and never run a paid provider call without the user's approval.

If the bug does not reproduce (see Reproduce), do not fix it. Report what you tried and ask.

## Steps

### 1. Locate

1. Settle the branch as `$make-code-change` describes under Working Branch: a fix does not go on `main` or an integration branch. Run `git status --short` and leave unrelated work alone.
2. Read `AGENTS.md` and the `docs/backend/` guide for the domain the bug is in.
3. Find the code path from the entry point the user hit (the route, script or screen's request) to where the wrong value or status is produced. Search as `AGENTS.md` > Searching & Checks says. Trace who sees the bug end to end as `$codebase-recon` > Reproducing Behavior describes: the response model, and what the real caller sends.
4. Run the tests for the affected domain once and note failures that exist before any edit, so none is blamed on the fix.

### 2. Reproduce

Write the regression test first. It stays as the test that guards the fix.

- **Layer:** follow the Testing Priority in `$make-code-change`. A bug reachable through the API is reproduced end to end in `tests/integration/test_api_e2e.py`, through the real app and its middleware, with the existing `api` fixture and helpers, and the payload the real caller sends. Use a unit test only for one of that section's necessity reasons, and state the reason. If the disposable database (`TEST_DATABASE_URL`) is not available, say so and ask; do not drop to a unit test silently.
- **Run it and show the failure:** the command and the failing assertion with its values.
- **Check it fails for the right reason:** the assertion that fails is the one about the bug, with the values the bug predicts ("all 10 junk-header requests got 200"). An import error, fixture error, 401 from a broken login, or a 429 from state another case left behind is a setup failure: fix the test, not the code.
- **Isolate cases:** state that lives across requests (rate-limit buckets, caches, module globals, the shared client's cookies) must not leak between cases. Give each case its own fresh app or fixture, such as one parametrized case each, so a case cannot fail or pass because of an earlier one.
- **Guard against a vacuous pass:** assert that the setup each case relies on really happened (the cookie is set, the user exists, the provider fake was called). Without it, a case can pass after the fix only because the setup silently did nothing.
- Cover each distinct way the bug shows (a junk token alone, and a junk token beside a valid cookie), not every input. Add a control case for the behavior that must not change (a real session keeps its quota); it passes before the fix and catches a fix that goes too far.
- If the reported case passes, the report is a symptom: find the condition that triggers it (a header, a stale token, a nine-hole round) before calling the bug unreproduced.

Do not edit application code in this step.

### 3. Confirm

Stop and send the user a short message:

- **Bug:** what happens, and what should happen, with the source for "should" (code, doc, or the report).
- **Reproduction:** the test file and name, its layer (and the unit-test reason if not E2E), the failing output, and why it fails because of the bug.
- **Cause:** the file and line, in one or two sentences.
- **Planned fix:** the smallest change and the files it touches, plus who else it affects (callers, the frontend, documented behavior).
- **Siblings:** the same pattern found elsewhere, or "none found", and whether the fix includes them.
- The exact question: `Do you want me to make this fix?`

Wait for explicit approval. If the user declines, delete the reproduction test unless they want it kept. If any escalation trigger applies, say so here instead of asking for approval.

### 4. Fix

Make the smallest change that fixes the cause, in the code that owns the rule (`docs/practices/shared.md`). No refactoring, renaming or cleanup alongside it; note those for later. If the fix turns out to need more than the approved change, stop and ask again.

### 5. Prove

1. **Pass:** rerun the reproduction test and show it passing. Check it passes for the right reason: the guard assertions still hold, and every case asserts the fixed behavior, not something the fix made unreachable.
2. **Mutation check:** put the old code back and show the test fails, then restore the fix:
   - Copy the fixed file to a scratch directory, put the old code back by hand, and clear bytecode before running: `find . -path ./.venv -prune -o -type d -name __pycache__ -exec rm -rf {} +`. A stale `.pyc` can survive a restore with the same size and modification second.
   - Run the test, record which cases fail and with what values.
   - Also try each plausible half-fix (one of two checks, the wrong precedence) and an over-correction (treat every caller as anonymous), one at a time: a case should fail for each. Every case, controls included, should fail under at least one mutation; one that never fails guards nothing in this fix, so drop it or say what it guards.
   - Copy the fixed file back, confirm it matches the copy (`cmp`), clear `__pycache__` again, and rerun the test to show it passes.
3. **Siblings:** search for the same pattern elsewhere (the same check, helper or query shape). A sibling the confirmation did not include is reported, not fixed, unless the user approves it.
4. **Reach:** when the fix touches shared code (a helper, middleware, dependency, repository method or model used by more than one caller), run `$trace-impact` (`.codex/skills/trace-impact/SKILL.md`) and run the tests of every caller it finds.

### 6. Finish

1. Run the Final Gates and then the Completion Review Loop in `.codex/skills/implementation-loop/SKILL.md`. Read them there; do not skip or restate them. In the review, the approved diagnosis and fix stand in for the plan.
2. When the fix changes behavior that `docs/`, `CLAUDE.md` or `AGENTS.md` describes, run `$update-docs`.
3. Do not commit. When the user asks to commit, push or write PR text, run `$ship-pr`; the confirmation message stands in for the implementation plan when it lists what to stage.

## Final Response

Finish with:

- **Cause:** one or two sentences, with the file and line.
- **Fix:** the changed files and what changed.
- **Test:** its file, name and layer, the failing output before the fix, and the passing run after.
- **Mutation:** each mutation tried, and which cases failed.
- **Gates and review:** the Final Gates' results, the Completion Review Loop's outcome, and failures that existed before the fix.
- **Docs:** guides updated, or "none needed".
- **Left alone:** siblings, cleanup or related bugs noticed but not fixed, and anything unverified.

Do not ask whether to commit.

## Continuous Skill Improvement

At the end of every invocation, check whether this run exposed a reusable gap in this skill. Typical evidence:

- A reproduction test failed or passed for the wrong reason and a rule above would have caught it.
- A bug was handled here that should have escalated to `$make-code-change`, or escalated when it did not need to.
- A mutation check could not fail, or a stale build let it pass.

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`: the smallest correction, kept separate from the user's task and listed under "Skill changes", with no weakened gates. If no reusable gap appeared, leave the skill unchanged.
