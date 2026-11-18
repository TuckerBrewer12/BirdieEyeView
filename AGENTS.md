# AGENTS.md

How to work in this repository. Every coding agent reads this file: Codex and Cursor read it directly, and Claude Code reads it through `CLAUDE.md`, a symlink to it. Keep one copy.

## The app

BirdieEyeView turns a photo of a paper golf scorecard into a round, then tracks rounds, courses, a WHS handicap and stats.

- **Backend:** FastAPI, asyncpg, Pydantic v2 (Python 3.13). Scanning is Mistral OCR, a Gemini table merge, then plain-code parsing and assembly. Course data comes from GolfCourseAPI.
- **Frontend:** React, TypeScript, Vite, Tailwind, React Query, D3 for charts, Capacitor for the native shell.
- **Database:** PostgreSQL with the `courses` and `users` schemas.

`docs/` is the map. Read the guide for the area you are changing before you change it:

| Area | Guide |
|---|---|
| How it fits together | `docs/architecture.md` |
| `api/`, `services/`, `models/`, `analytics/`, `database/`, scanning, `tests/` | `docs/backend/<area>.md` |
| Frontend structure, the kit, each page | `docs/frontend/` |
| Conventions | `docs/practices/` |
| Review bots | `.github/review-bots/README.md` |

## Commands

```bash
# Backend (port 8000); needs a .env, see .env.example
source .venv/bin/activate && uvicorn api.main:app --reload
pip install -r requirements.txt            # pins are exact; CI checks

# Frontend (port 5173)
cd frontend && npm install && npm run dev
```

Checks, narrowest first:

```bash
.venv/bin/python -m pytest -q tests/test_<area>.py
.venv/bin/python -m pytest -q --ignore=tests/integration
.venv/bin/ruff check .
for c in scripts/ci/check_*.py; do .venv/bin/python "$c"; done

cd frontend
npm test                      # Vitest
npm run lint && npm run typecheck
npm run test:ui         # Playwright flows
npm run test:screenshots      # Playwright looks
```

- `tests/integration` needs `TEST_DATABASE_URL` pointing at a disposable database; it drops the schemas.
- Run Playwright locally with `--workers=1` and only the specs your change reaches: `node scripts/select-specs.mjs --kind ui --base origin/main` (or `--kind screenshot`) lists them with the reason for each. On a PR, CI runs the same selection and writes the reasons to the run summary; `main` runs every spec. To run every spec on a PR, add the `full-suite` label and re-run; to turn selection off everywhere, set the `SPEC_SELECTION` repository variable to `off`.
- Screenshot baselines are the Linux renders of CI's Playwright image, so a Mac's screenshot run doesn't match them; CI checks looks. To refresh them, look at the failing run's diffs, then add the `update-screenshots` label to the PR: CI regenerates the baselines, commits them to the branch and checks them again.
- The live scan eval costs provider credits. Run it with the `run-scan-evals` or `run-quick-scan-eval` label on a PR.

Generated files are never edited by hand:

| Change | Then run | Generated |
|---|---|---|
| An API request or response model | `python scripts/dump_openapi.py` then `npm run gen:api` | `frontend/openapi.json`, `frontend/src/types/api.gen.ts` |
| `frontend/src/brand/theme/tokens.ts` | `npm run gen:tokens` | `frontend/src/brand/theme/tokens.gen.css` |

CI fails when either is stale.

## Backend rules

- **Layers.** Routers check access, parse requests and map errors; they do no golf math. Workflows live in `services/`, golf rules and validation in `models/`, aggregate figures in `analytics/`, SQL in `database/repositories/`. A response is built in one place per resource (`api/round_responses.py`, `api/course_responses.py`, `api/*_responses.py`).
- **Every response is typed** by a `response_model`, which is how the frontend gets its types.
- **Partial data is normal.** Model fields are optional because scans are incomplete. Unknown, zero, omitted and explicitly cleared are different states; keep them apart from the form to the SQL.
- **One figure, one owner.** The handicap index is `api/player_handicap.py`, and every course handicap and net score starts from it through `analytics/handicap.py`. The best round is `analytics.stats.best_round`: the lowest complete 18-hole round. Records count full rounds only. Good, bad or neutral is `analytics/verdicts.py`. Reuse these; never recompute one beside them.
- **Courses.** `user_id IS NULL` is a read-only master course; otherwise the course belongs to that user. A round can exist without a course: `par_played` and `handicap_played` live on each hole score, `course_name_played` on the round.
- **Migrations** are numbered SQL files in `database/migrations/`, applied by hand. `database/schema.sql` is the source of truth; change both.
- **Async.** Never block the event loop: no `requests`, no `time.sleep`, hash and process images off the loop. Ruff bans the obvious cases.
- **Errors.** Never send exception text to a client; `scripts/ci/check_backend_conventions.py` checks for it, and for hard-coded hole counts.

## Frontend rules

- **MVVM, one folder per page** under `frontend/src/pages/<name>/`: the view (`<Name>Page.tsx`), its view model (`use<Name>PageViewModel.ts`, screen state and wording only), query and mutation hooks (server state and cache), a repository (endpoint and DTO to domain mapping), `components/`, `previews/` and `tests/`. Copy `pages/rounds/` or `pages/courses/`.
- **The server owns golf figures.** The client formats and colours them and never recomputes them. The one exception is live totals for an unsaved edit or a scan under review (`Round.previewEdits`, `Round.fromScan` in `domain/round.ts`).
- **Shared code is portable.** `domain/`, `data/`, repositories and view models import nothing from `@/brand`, `react-router` or the DOM, so they can move to React Native later. ESLint enforces it.
- **Build from the kit** in `src/brand/` (`components/`, `charts/`, `theme/`). A generic piece another page will want goes in the kit, with a preview and a screenshot spec. Kit components take domain types, never DTOs.
- **Every design value is a token** in `src/brand/theme/tokens.ts`, used through its Tailwind utility (`bg-card`, `text-muted-foreground`, `text-score-birdie`) or `tokens.*` for SVG paint and motion. No hex, `rgb()`, raw palette classes (`text-gray-500`), arbitrary values (`text-[11px]`) or raw animation numbers. Dark mode comes from the tokens and `dark:` variants; `useTheme()` only reads and sets the preference.
- **Formatting lives in `src/domain/`** (`format.ts`, `date.ts`, `score.ts`, `course.ts`). A date-only string is a calendar day, never UTC midnight.
- **No mocks.** Tests use `Fake*` doubles from `src/testing/`, never `vi.fn` or `vi.mock`. Pages are tested through a Playwright robot against `FakeBackend`: UI tests for behaviour, screenshot specs for looks.
- **The repo's lint rules** (`frontend/eslint/`: `golf/*`, `kit/*`, `specs/*`) name the kit piece, token or helper to use instead. A new rule lands with the fixes for everything it flags: no exemption lists, and no `eslint-disable` without a reason.
- `scripts/ci/check_frontend_conventions.py` checks that every kit component has a preview and a screenshot spec, every page a robot with screenshot specs and UI tests, and every view model a test.

## Comments

Write code that needs no comments. Names, types and small functions carry the meaning. The No Comments Bot applies pstack's `no-comments` skill to every PR and deletes added comments that break these rules, so writing them only adds churn.

A comment may stay only if it is:

- a legal or license header;
- a gotcha forced by something we cannot change (a vendor, browser, driver or protocol quirk), stated in one line;
- an issue or RFC link for a constraint the code cannot express;
- a tool directive (`noqa`, `type: ignore`, `eslint-disable` with its reason, `@ts-expect-error`, `prettier-ignore`), or a script's usage and env lines.

Everything else goes, including `/** */` doc comments: nothing here is a public API, so a method or export never needs one. Also gone: narration of what the next line does, section banners, commented-out code, TODOs without an issue, Python docstrings, and `IMPORTANT` / `do not remove` warnings the code does not prove. If code in our own repo is surprising enough to need a comment, rename, extract, type or redesign it until it isn't. Don't explain it. A long justification for a workaround means the workaround should go. Never shorten a bad comment; delete it.

## Pull requests

- Branch from `main` and open PRs against `main`. The description is two sections, **What?** and **Why?**, and nothing else.
- After every push, wait for CI and the review bots (Brand Kit, MVVM, UI Test Checker, Frontend coverage, No Comments). Fix what is right, reply on each thread with what you did or why you didn't, and repeat until they have nothing new. A check that also fails on `main` is inherited: say so rather than fixing it in an unrelated PR.
- The bots' fix PRs (`bot-fix/…`, labelled `skip-bots`) target your branch. Check one against the latest base before merging it; if it duplicates or conflicts with something already there, fix it on your branch and close it with a note.
- Keep behaviour-preserving cleanup separate from rule changes. Run `pip freeze > requirements.txt` before pushing a new backend dependency.

## Keeping this file current

Edit this file when a rule, command or responsibility changes, and the `docs/` guide for the area alongside it. Keep it to rules and pointers: what a module does belongs in `docs/`, and the code is the source of truth for details.
