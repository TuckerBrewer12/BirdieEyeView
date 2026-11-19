---
name: api-contract-change
description: "Project-specific API contract workflow for the Golf ScoreCard app. Use when a change adds, removes, renames or retypes a field on an API request or response model (api/schemas.py, api/request_models.py, a response_model), changes an endpoint's shape, status code or error body, when the user asks to regenerate the types (frontend/openapi.json, api.gen.ts), or when the OpenAPI schema and the frontend have drifted or CI reports either generated file stale. Classifies the change for API clients, regenerates the schema and TypeScript types, updates every frontend use and fake, and runs both sides' checks so backend and frontend never drift."
---

# API Contract Change

## Purpose

Carry a change to an API request or response model through to the frontend in one change: the model, the response builder, the generated schema and types, every frontend use and test double, and both sides' checks. The backend and the frontend must never disagree about a shape.

Use it on its own, or inside `$make-code-change` whenever the OpenAPI schema changes: recon and planning use steps 1 and 4 to fill the plan's Frontend Impact, and the implementation loop runs steps 2, 3, 5 and 6.

## Where The Contract Lives

- **Response models** in `api/schemas.py` (and `api/auth_schemas.py`, `api/scan_report_schemas.py`), each built in one place: `api/round_responses.py`, `api/course_responses.py`, the other `api/*_responses.py`. Routers name them as `response_model`.
- **Request models** in `api/request_models.py`.
- **Generated, never edited by hand:** `frontend/openapi.json` (from `scripts/dump_openapi.py`) and `frontend/src/types/api.gen.ts` (from `npm run gen:api`). CI fails when either is stale: `python scripts/dump_openapi.py --check` and `npm run check:api` in `.github/workflows/tests.yml`.
- **Frontend names** for generated types in `frontend/src/types/api.ts` (`RoundDto`, `RoundSummaryDto`, …).
- **Frontend flow:** `lib/api.ts` (transport only) → a repository (`pages/<page>/<name>Repository.ts` or `data/*Repository.ts`) mapping each DTO to a domain type (`Round.fromSummary` in `domain/round.ts`) → view model → view and kit. Kit components and views take domain types, never DTOs; ESLint rejects API types imported in UI files.
- **Test doubles:** `frontend/src/testing/fakes/` (`FakeBackend` and response builders such as `roundResponses.ts` that mimic the server) and `frontend/src/testing/fixtures/`. Tests use them, never mocks.

Facts that decide what a change breaks:

- `ResponseModel` sets `json_schema_serialization_defaults_required=True`, so every response field is required in the generated type, defaults included: `x: Optional[int] = None` becomes `x: number | null`, always present. A new response field therefore fails the type check wherever the frontend builds that DTO (fakes, fixtures, previews). That is how you find them; fill them, do not loosen the type.
- Request models are plain `BaseModel`: a field with a default becomes optional (`x?:`) in the generated type.
- One response model can sit in several responses (`RoundSummaryResponse` is in the round list, link-course, the dashboard's `recent_rounds` and course analytics' `rounds`). The builder change reaches all of them.
- A model used as both a request and a response can split into `<Name>-Input` and `<Name>-Output` schemas, which renames the key `types/api.ts` reads.
- Not everything is generated. Some request bodies are typed by hand (`UpdateRoundBody` in `pages/rounds/roundsRepository.ts`, the `updateRound` body in `lib/api.ts`), `fetchJSON<T>` casts without checking, and status codes and error bodies (`detail`, a scan's `failure`) are not in the schema. The type check does not catch these; search for them.

## Who Edits The Frontend

Check the current branch's `AGENTS.md` for who owns `frontend/`. Where the frontend owner maintains it (`$make-code-change` says so on `backend-refactor`), this skill still makes the edits that keep the contract whole: the generated files, `types/api.ts`, the repository and domain mapping, hand-typed request bodies, fakes and fixtures, and the tests that cover them. Using a new field in a page (showing it, a new view-model state) is frontend feature work: do it when the user asked or the approved plan names it, otherwise hand it to the frontend owner in the report. Carry a field only as far as something uses it.

## 1. Classify The Change

Decide what an API client sees, field by field:

- **Additive:** a new response field, a new optional request field, a new endpoint. Old clients keep working.
- **Breaking:** a removed or renamed field, a changed type or unit, a field that can now be `null` or a required request field, a new value in an enum or `Literal` the frontend switches on (`ScoreKind`), a changed status code or error body, a removed endpoint, or stricter request validation.
- **Behavior only:** same shape, different values (a figure now counts nine-hole rounds). The schema does not change, but every reader of the value is affected.

A breaking change needs the user's explicit approval before it is made. Propose a migration: add the new shape beside the old, move the frontend to it, and remove the old one in a later change. The web frontend and the backend deploy as separate services, and an installed native app (Capacitor, bundling `frontend/dist`) keeps sending and reading the old shape until its user updates, so say how long the old shape must stay.

## 2. Change The Backend

- Change the model, then the one builder that fills it (`api/*_responses.py`) or the request model's conversion (`to_reviewed_scan()`, `to_course()`). A router never builds a response by hand.
- A figure comes from its owner (the `models/` method or the `analytics/` function `AGENTS.md` names) and is computed on the server. Never leave a figure for the frontend to work out from other fields; the client only formats it. The one exception is live totals for an unsaved edit or a scan under review (`Round.previewEdits`, `Round.fromScan`).
- Prove it end to end per the Testing Priority in `.codex/skills/make-code-change/SKILL.md`: assert the field or status in the E2E scenario that already calls the endpoint in `tests/integration/test_api_e2e.py`. One builder fills every response that carries the model, so one assertion per builder is enough unless a response fills the field differently.

## 3. Regenerate

From the repository root, with its Python (a worktree uses the main checkout's `.venv/bin/python`):

```bash
.venv/bin/python scripts/dump_openapi.py
cd frontend && npm run gen:api
```

If `frontend/node_modules` is missing (a fresh worktree), run `npm ci` in `frontend/` first. Then read `git diff -- frontend/openapi.json frontend/src/types/api.gen.ts` in full: it must show only the intended change. Another difference means the base was already stale or another model changed; find out which before going on. Generated files are committed with the change that caused them (`$ship-pr` stages them).

## 4. Find Every Frontend Use

Use `$trace-impact` (`.codex/skills/trace-impact/SKILL.md`) for each changed field, model and endpoint, over all of `frontend/src`, and list:

- every response and route that carries the model. To list the schema's uses:

  ```bash
  .venv/bin/python - RoundSummaryResponse <<'EOF'
  import json, sys
  def walk(node, path):
      if isinstance(node, dict):
          for key, value in node.items():
              if key == "$ref" and value.endswith("/" + sys.argv[1]):
                  print(path)
              walk(value, f"{path}/{key}")
      elif isinstance(node, list):
          for i, value in enumerate(node):
              walk(value, f"{path}[{i}]")
  walk(json.load(open("frontend/openapi.json")), "")
  EOF
  ```

  Run it again for each schema it prints under `/components/schemas/` (here `DashboardResponse`, `CourseAnalyticsResponse`) until only `/paths/` remain.

- the DTO name in `types/api.ts`, and its readers: `lib/api.ts`, repositories, domain mappers (`fromDto`, `fromSummary`), view models;
- the snake_case field name read directly, and hand-typed request bodies that mirror a request model;
- fakes, fixtures and previews that build the DTO (`summaryResponse` in `testing/fakes/roundResponses.ts` feeds the round fixtures, course analytics and kit previews);
- for a status or error change: `lib/api.ts`'s error handling, `data/scanReportRepository.ts`, and the `FakeHttpError`s `FakeBackend` returns;
- the page tests (Vitest, Playwright UI and screenshot specs) whose data goes through these.

## 5. Update The Frontend

Follow the current branch's `AGENTS.md` Frontend rules and `docs/practices/frontend.md`:

- Map the DTO field into the domain type in the repository or domain mapper; view models and the kit read the domain type.
- Make each fake and fixture fill the field the way the server does, so tests keep seeing what production sends.
- For a breaking change, move every reader to the new shape before the old one is removed.
- Update or add the tests that cover the mapping (Vitest, with `Fake*` doubles) and, when a page shows the field, its UI spec and screenshot spec through the page's robot.

## 6. Checks

- **Backend:** the Final Gates in `.codex/skills/implementation-loop/SKILL.md`, commands from `docs/practices/testing.md`. They include `dump_openapi.py --check`.
- **Frontend**, from `frontend/` (exact scripts in `package.json`, list in `docs/practices/testing.md`): `npm run check:api`, `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm run knip`, `npm test`. Run `npm run build` when the change touched more than types and mapping.
- **Playwright:** none when no page's view changed (a field mapped but not yet shown). Otherwise only the specs of pages whose view changed, locally with `--workers=1`, e.g. `npx playwright test --project=<ui project> --workers=1 <spec paths>`. The project and script are `ui` / `npm run test:ui` on `main` and `espresso` / `npm run test:espresso` on `backend-refactor`; check `package.json`. CI runs the full suite.
- **Screenshots:** follow the branch's `docs/practices/testing.md`. On `main` the baselines are Linux renders from CI's Playwright image: do not commit Mac renders; review the failing run's diffs, then add the `update-screenshots` label to the PR. A branch whose guide still describes `*-darwin.png` baselines refreshes them locally with `npm run test:screenshots:update` after reviewing the change.

A check you could not run is reported as not run, with the reason.

## 7. Report

End with, for the final response and `$ship-pr`'s PR text (its What section):

- **Contract change:** each endpoint and model, field by field, classified additive, breaking or behavior only; for a breaking change, the migration and what an older native app sees.
- **Frontend:** files changed, or "no frontend change", and what is left for the frontend owner (a field now available to show, a breaking change to finish).
- **Generated files** regenerated, and the checks run on both sides with results.
- **Docs:** the `docs/backend/` guide and the `AGENTS.md`/`CLAUDE.md` bullet describing the builder or endpoint are `$update-docs`' job; name them so it updates them.

## Continuous Skill Improvement

At the end of every invocation, check whether this run exposed a reusable gap in this skill. Typical evidence:

- A frontend use, fake or fixture surfaced only in CI or review, not in step 4.
- The generated diff held something the steps above did not explain.
- A classification was wrong: an "additive" change broke a client.
- A command or script name here no longer matches `package.json` or `docs/practices/testing.md`.

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`: the smallest correction, kept separate from the user's task and listed under "Skill changes", with no weakened gates. If no reusable gap appeared, leave the skill unchanged.
