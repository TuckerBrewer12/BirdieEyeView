# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack golf scorecard app. Scans physical scorecards via LLM and tracks rounds, courses, and player statistics.

- **Backend**: FastAPI + asyncpg + Google Gemini (Python)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **DB**: PostgreSQL with schemas `courses` and `users`

## Setup & Dependencies

```bash
# Backend
pip install -r requirements.txt   # pydantic, google-genai, python-dotenv, asyncpg, fastapi, uvicorn
pip freeze > requirements.txt     # run before pushing new dependencies

# Frontend
cd frontend && npm install
```

Requires a `.env` file with `GOOGLE_API_KEY` for LLM extraction.

## Running

```bash
# Backend (port 8000)
source .venv/bin/activate && uvicorn api.main:app --reload

# Frontend (port 5173)
cd frontend && npm run dev
```

DB default: `host=localhost port=5432 database=golf_scorecard` (no DATABASE_URL in .env)

## Running Tests

```bash
python -m unittest tests.test_llm.TestScorecardExtraction.test_example_scorecard      # full extraction
python -m unittest tests.test_llm.TestScorecardExtraction.test_scores_only_extraction  # scores-only
python -m unittest tests.test_llm.TestScorecardExtraction.test_smart_with_null_repo    # SMART strategy
```

## Architecture

### `models/` — Pydantic v2 domain models

All models inherit from `BaseGolfModel` (in `base.py`), which provides `validate_assignment=True` and an `update_field()` method for safe field updates with error messages.

**Composition chain:** `User` → `Round` → `HoleScore` (scores) + `Course` → `Hole` + `Tee`

- **Hole** — single hole: par (3-6), handicap (1-18)
- **Tee** — tee box: color, slope/course ratings, per-hole yardages dict with validation
- **Course** — full course: contains ordered lists of Holes and Tees. Has `get_par()`/`get_tee()`/`get_hole()` accessors and front/back nine par properties
- **HoleScore** — one player's score on a hole: strokes, putts, fairway/GIR stats. Validates putts ≤ strokes. Has `to_par(par=None)` and `get_score_type()` — both fall back to `self.par_played` when no par is passed
- **Round** — complete round: references an optional Course + tee_box color string. Contains ordered HoleScores. Has `get_par()` (sums `par_played` when no course), `get_hole_par(n)`, `total_to_par()`, and score-type calculation methods
- **UserTee** — user-owned tee config linked to an optional master course (`models/user_tee.py`)
- **User** — golfer: handicap (-10 to 54), `scoring_goal` (optional integer target score), contains Rounds

**Key design decisions:**
- All fields are `Optional` to handle incomplete/partial scanned data
- Lists (holes, tees, hole_scores) are stored sorted by hole number
- "Get or calculate" pattern: methods like `get_par()`, `get_total_putts()` return the stored value if set, otherwise calculate from child objects
- `hole_id` on `hole_scores` is NULLABLE — rounds can exist without a linked course row
- `par_played` / `handicap_played` stored directly on each `hole_score` (self-contained round)
- `course_name_played` stored on `rounds` for display when `course_id IS NULL`

### `llm/` — Scorecard extraction via Google Gemini

Three extraction strategies (`llm/strategies.py`):
- **FULL** (default) — extracts everything from a scorecard image (course, tees, holes, scores)
- **SCORES_ONLY** — extracts only player scores when course is already known
- **SMART** — identifies course name first (using fast Flash model), looks up in DB, then uses SCORES_ONLY if found, else falls back to FULL

Key files:
- `scorecard_extractor.py` — `extract_scorecard()` public API, Gemini calls, model building
- `prompts.py` — prompt templates + Pydantic models for raw LLM JSON responses
- `strategies.py` — `ExtractionStrategy` enum, `CourseRepository` protocol
- `confidence.py` — per-field confidence scoring from LLM extraction

### `services/` — Business logic layer

- `scan_service.py` — course resolution, par lookup, hole score building, user tee creation extracted from `api/routers/scan.py`. LLM-extracted values are clamped to valid ranges before constructing Hole/Tee/UserTee to prevent Pydantic validation errors on bad scan data.

### `api/` — FastAPI routers

- `routers/scan.py` — `POST /api/scan/extract` (typed `ScanResponse`: the card as read, per-hole confidence, fields to review) and `POST /api/scan/save`. Save flow: looks up existing course; if not found, saves round without a course (no auto-creation). Populates `par_played` from `course_holes` param.
- `routers/courses.py` — GET/POST/PUT + clone endpoint. `user_id IS NULL` = master/global course; `user_id IS NOT NULL` = user-owned custom course.
- `routers/rounds.py` — GET/PUT/DELETE for rounds and hole scores
- `routers/users.py` — user management + user tee CRUD (`/api/users/{id}/tees`); `UpdateUserRequest` accepts `scoring_goal`; a user is sent as `UserResponse` (the profile, no rounds)
- `routers/stats.py` — player analytics endpoints; includes `GET /{user_id}/goal-report` and `GET /{user_id}/benchmark`
- `api/request_models.py` — shared Pydantic request/response models
- `api/round_responses.py` — `round_summary()` / `round_list()` / `round_detail()`: the one place a round's response is built. Every round endpoint (list, detail, update, link-course, dashboard) returns the figures the `Round` model works out (score, par, to-par against the holes played, nine totals plus each nine's par/to-par/putts/GIR/yards, putts, GIR, yards, `holes_played`, per-hole par/handicap/yardage/to-par/`kind`/`three_putt`, `score_counts`); the frontend displays them and does not recompute them. The list carries each round's `best_rank` (full rounds by to par, then nines; `analytics.stats.best_round_ranks`), and the detail the signed-in golfer's `course_handicap` and `net_score`.
- `api/course_responses.py` — `course_detail()`: the one place a full course's response is built (`GET /courses/{id}` and a round's `course`). It carries the figures the `Course`/`Tee` models work out: par, front/back nine par, and per tee its total and nine yardages (null until every hole in the nine has a value) and the signed-in golfer's `course_handicap` off it.
- `api/player_handicap.py` — `player_handicap_index(db, user)`: the golfer's own index (last 20 rounds, held at the handicap they gave; `analytics.handicap.player_handicap_index`). It is the one index every screen shows: the dashboard's and analytics' `handicap_index` (analytics keeps it whatever the course or timeframe filter), and the last point of the handicap trend (`player_handicap_trend`: the index over the 20 rounds ending with each round). Every course handicap and net score starts from it — round detail, course tees, scanned tees (`POST /scan/extract`) and the analytics net-score trend — through `analytics/handicap.py` (`course_handicap`, `round_course_handicap`, `round_net_score`), so one round shows one net score everywhere. A nine has no course handicap or net score: tee ratings are for 18 holes.
- One best round: `analytics.stats.best_round` (the round list's `best_rank` 1: full rounds by to par, a nine only without one) is the dashboard's `best_round`/`best_recent_round_id`, analytics' `kpis.best_round`, the course page's best score and The Lab's peak game. Records set by a round's total (lowest/highest round, fewest putts, most greens, score/putt/GIR breaks, first round under par, the goal report's `lowest_score`) count full rounds only (`stats.full_rounds`).
- `api/course_analytics_responses.py` — `course_analytics()`: `GET /stats/course-analytics/{user}/{course}` as a typed `CourseAnalyticsResponse`. Carries the player's rounds at the course (newest first), rounds played, scoring average, best and worst score, the score trend, the per-hole rows from `analytics/stats.py`, and those holes' averages summed by nine (`hole_averages_front_nine`/`_back_nine`/`_total`, the scorecard's Out/In/Total).
- `api/analytics_responses.py` — `analytics_response()`: `GET /stats/analytics/{user}` as a typed `AnalyticsResponse`, one model per section (KPIs, per-round trends, scoring breakdowns, handicap trend with `differential_status`, notable achievements). The goal report, round comparison and played courses are typed too (`GoalReportResponse`, `RoundComparisonResponse`, `PlayedCourseResponse`).

**API endpoints:**
- `POST /api/scan/extract` — run LLM extraction on uploaded image
- `POST /api/scan/save` — save extracted round (accepts `course_holes: [{hole_number, par}]`)
- `GET/POST /api/courses` — list/create courses (`?user_id=` for custom)
- `PUT /api/courses/{id}` — update course (403 on master courses)
- `POST /api/courses/{id}/clone` — clone master to user-owned copy
- `GET/PUT/DELETE /api/rounds/{id}` — round CRUD; PUT recalculates `total_score`
- `GET/POST /api/users/{id}/tees` — list/create user tees
- `PUT/DELETE /api/users/{id}/tees/{tee_id}` — update/delete user tees
- `GET /api/stats/{user_id}/goal-report?limit=` — goal gap analysis + ranked savers, and each scored round marked met or not (`attempts`)
- `GET /api/stats/{user_id}/benchmark?against=handicap|peak|friend&handicap=&friend_id=` — The Lab's comparison: the benchmark's shape and each par type's gap and verdict against it

### `database/` — Async PostgreSQL layer (asyncpg)

Two DB schemas: `courses` (courses, holes, tees, tee_yardages) and `users` (users, rounds, hole_scores, scorecard_scans, user_tees).

- `connection.py` — `DatabasePool` singleton for pool lifecycle
- `converters.py` — all row↔model conversion between DB rows and Pydantic objects
- `db_manager.py` — `DatabaseManager` facade composing repositories
- `sync_adapter.py` — `SyncCourseRepositoryAdapter` wraps async repo for sync `CourseRepository` protocol (uses `run_coroutine_threadsafe`; `loop` must be obtained BEFORE constructing the adapter)
- `repositories/course_repo.py` — CRUD for courses + fuzzy name search (pg_trgm) + `clone_course`; user_id-aware search/create
- `repositories/user_repo.py` — CRUD for users
- `repositories/round_repo.py` — CRUD for rounds, hole_scores, scorecard_scans; includes `update_hole_scores`
- `repositories/user_tee_repo.py` — CRUD for `users.user_tees`

**Schema source of truth:** `database/schema.sql`
**Migrations:** `database/migrations/` (incremental SQL files; 001, 002, 003 applied)
- 001: `user_id` on `courses.courses`
- 002: `par_played`, `handicap_played`, `course_name_played`, `user_tee_id`, nullable `hole_id`
- 003: `scoring_goal SMALLINT` on `users.users`

**Custom course design:**
- `user_id IS NULL` = master/global course (read-only for regular users)
- `user_id IS NOT NULL` = custom course owned by that user
- Partial unique indexes replace old `UNIQUE(name, location)`:
  - `idx_courses_unique_master`: `(lower(name), location) WHERE user_id IS NULL`
  - `idx_courses_unique_user`: `(lower(name), location, user_id) WHERE user_id IS NOT NULL`

### `frontend/` — React + TypeScript + Vite

Every page is MVVM on the brand kit. Under `frontend/src/`:

- `pages/<kebab-name>/` — one folder per page: `<Name>Page.tsx` (the view), `use<Name>PageViewModel.ts` (screen state only), `<name>Repository.ts` (endpoint + DTO→domain mapping), `use<Thing>.ts` query/mutation hooks (server state, cache effects), `model.ts`/`present.ts` (shaping and wording), `components/` (page-only views), `previews/`, and `tests/` (screenshot specs, espresso flows through a `*.robot.ts`, view-model tests with `Fake*` doubles). `pages/rounds/` and `pages/courses/` are the models to copy.
- `data/` — queries, mutations and repositories more than one page shares (`useUser`, `useUpdateUser`, `useGoalReport`, `useAnalytics`, `useCourseSearch`, …) and `queryKeys`.
- `domain/` — golf types, words and formatting, and DTO→domain mapping. The one set of formatters lives here: `date.ts` (a date-only string is a calendar day, never UTC midnight), `format.ts` (`pluralize`, `formatPercent`, `formatOneDecimal`), `score.ts` (`toParLabel`, `formatAverageToPar`), `course.ts` (`formatCourseName`). The server owns golf figures; the client never recomputes them.
- `brand/` — the kit: `components/`, `charts/`, `theme/` (tokens), with a preview and screenshot spec for each.
- `platform/` — web and native adapters (image compression, file preview, sharing, the Capacitor camera) the app passes in.
- `lib/` — transport only: the API client (`api.ts`), its base URL, the session token and user-facing error wording.
- `context/` — `AuthContext` and the theme provider.
- `testing/` — `Fake*` doubles, fixtures and Playwright helpers.

Shared code (`domain/`, `data/`, repositories, `*Model.ts`, view models) imports nothing from `@/brand`, `react-router` or the DOM; eslint enforces it.

---

## UI Design System

### Philosophy
Clean, minimal, data-first. Premium/professional feel — refined spacing, subtle motion, semantic colour. Not flashy; every visual element earns its place. Build from the kit in `src/brand/` before writing markup; a generic piece another page will want belongs in the kit.

### Colour
Every colour is a token in `src/brand/theme/tokens.ts`, used through its Tailwind utility. No hex, `rgb()`, `oklch()`, `color-mix()` or raw palette class (`text-gray-500`, `bg-white`) anywhere else.

- **Surfaces and ink:** `bg-background` (page), `bg-card` + `text-card-foreground`, `text-foreground`, `text-muted-foreground` (secondary text, captions), `bg-muted`, `bg-secondary`, `bg-accent`, `border-border`, `border-input`, `ring-ring`.
- **Brand:** `bg-primary` / `text-primary` / `text-primary-foreground` — forest green for primary actions, accents and section labels. `text-destructive` for errors and deletes.
- **Score kinds** (`eagle`, `birdie`, `par`, `bogey`, `double`, `triple`, `quad`) encode data: `text-score-<kind>` for ink, `bg-score-<kind>-base` + `text-score-<kind>-on-base` for a fill, `bg-score-<kind>-muted` for a wash. When the kind or to-par is only known at runtime use `scoreFillClass()`, `scoreOnFillClass()`, `toParTextClass()` or `toParBadgeClass()` from `@/brand/theme`.
- **Other families:** `from-sidebar to-sidebar-end` + `text-sidebar-foreground` (the side rail), `bg-tee-<colour>` / `text-tee-<colour>-on` (through `TeeSwatch`), `bg-scan-row-<row>` (scorecard layout rows), and `tokens.color.chart.*` for chart chrome.

### Type and measures
- DM Sans (`font-sans`) and DM Mono (`font-mono`); the body font is set once in `index.css`.
- Type roles, not pixel sizes: `text-caption`, `text-meta`, `text-label`, `text-body-sm`, `text-body`, `text-title`, `text-hero`, `text-eyebrow`, `text-kicker`, `text-section` (see Brand tokens). `tracking-*` (`tracking-stat`, `tracking-chip`, …) sits beside Tailwind's sizes. Tailwind's scale (`text-sm`, `p-4`, `gap-2`) is fine; arbitrary values (`text-[11px]`, `w-[54px]`) are not.
- Measures off the 4px scale are named: `rounded-card`, `rounded-tooltip`, `gap-tight`, `h-chart`, `w-preview`, `size-icon-xs`, `grid-cols-round-preview`, …
- Shadows follow `--shadow`: `shadow-card` for a lifted surface or a hover, `shadow-hairline` under a pinned bar. Tailwind's `shadow-sm` / `-md` / `-lg` are wired to the same token, so they lift in dark mode too.

### Kit components
- **Page:** `PageTitle`, `PageHeader` (the bar pinned once the title scrolls off), `SectionLabel` (the eyebrow above a section), `AppShell`.
- **Surfaces:** `Card` (`CardHeader`, `CardTitle`, `CardContent`, …), `Sheet`, `Alert`, `Collapse` / `Collapsible`.
- **Figures:** `Stat` (a figure and its label, `sm`–`xl`), `ToParFigure`, `ScoreCountChip`, `Meter`, `TeeSwatch`.
- **Lists and controls:** `Collection` (a list with its loading and empty states), `Button` (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`, `linkMuted`; `shape="pill"`), `ToggleGroup`, `SortControl`, `SearchField`, `Input`, `Field`.
- **Golf:** `RoundPreview`, `CoursePreview`, `RoundScorecard`, `ScorecardTable`, and the charts in `brand/charts/`.

### Motion
All animation is `framer-motion`, with its numbers from `tokens.motion` in `@/brand/theme`: `hoverScale` / `tapScale` on `spring` for hover and press, `entrance` for content arriving, `layout` for a block resizing, `draw` and `pop` for a chart line and its points, `duration.collapse`. `Reveal` fades a section up as it scrolls in and holds still for reduced motion. Fast enough to feel snappy, slow enough to register; no raw `stiffness` or `duration` in a component.

### Charts
Golf-native visualizations over generic chart types where possible. SVG charts use a `viewBox` and D3 scales (`d3-scale`, `d3-shape`) for the maths; Recharts draws trend, bar and area charts. SVG paint and Recharts props take `tokens.color.*` (`stroke={tokens.color.chart.muted}`), plus `chartTooltipStyle` and `chartTickStyle`. Geometry is `tokens.chart`. Tooltips find the nearest point on `onMouseMove` and close on `onMouseLeave`.

### Brand tokens (`src/brand/`)

**`src/brand/theme/tokens.ts` holds every design value.** `tokens.gen.css` is generated from it; never edit it by hand.

- **Colours, in two layers.** `palette` holds the raw colours by hue and step (`forest[700]`, `gray[400]`, `white`); nothing else writes a colour value. `modes.light` and `modes.dark` map each semantic colour (`card`, `mutedForeground`, `score.birdie.base`) onto a palette colour, another key (`alias("foreground")`), a `mix()` or an `alpha()`. Dark is the light mapping with overrides.
- **Generated CSS.** Run `npm run gen:tokens` after changing `tokens.ts`; CI's `check:tokens` fails if the CSS is stale. A colour's CSS name is its path in kebab case (`score.birdie.onBase` is `--score-birdie-on-base` and `text-score-birdie-on-base`); a measure is `--brand-<group>-<key>` with its utility (`h-chart`, `rounded-tooltip`).
- **TypeScript reads `tokens.*`.** `tokens.color` is the semantic colours as `var()` references (`tokens.color.score[kind].base` is `"var(--score-<kind>-base)"`), so dark mode still switches in CSS. Numbers are real values: `tokens.chart`, `tokens.motion`, `tokens.space`, `tokens.type.label.size`.
- **Where each goes.** SVG paint and chart-library props take `tokens.color.*` (`stroke={tokens.color.border}`, `<Cell fill={toParFill(toPar)} />`). HTML elements use Tailwind classes (`bg-card`, `text-score-birdie`), with a lookup of full class strings when the colour is picked at runtime (`scoreFillClass()`, `toParTextClass()`), never a class built from a template. A `var()` string isn't a colour to canvas; resolve it with `getComputedStyle` there.
- **Type roles.** `tokens.type` names each text style and bundles its size with the weight, tracking and line height that go with it: `text-caption`, `text-meta`, `text-label`, `text-body-sm`, `text-body`, `text-title`, `text-hero`, `text-eyebrow`, `text-kicker`, `text-section`. A class beside a role (`font-semibold`) still wins; uppercase stays a class.
- `tokens.test.ts` fails on a raw colour anywhere outside `palette` (the token files aside), on a semantic colour that doesn't map onto the palette, on a px/rem/em literal in `src/brand`, and if `capacitor.config.ts` drifts from `primary` / `background`.
- `frontend/eslint/` holds the repo's own lint rules, on for the kit (`src/brand`, apart from `brand/theme`, which is where these rules point), the app shell and every page. The `kit/*` rules flag styling that skips the tokens: hex colours, raw palette classes (`white` and `black` included), numeric opacity modifiers (`bg-primary/10`; use a named opacity from `tokens.opacity` such as `bg-primary/tint`), fraction and arbitrary Tailwind lengths, and raw numbers in motion props, inline `style` objects, and SVG/Recharts props (`kit-numbers.js`). The `golf/*` rules flag golf logic copied into a view: a table keyed by score type, a branch on to-par, `strokes - par` or a strokes/par comparison, a par fallback chain (`round.par ?? round.course?.par`), or a type re-declaring a domain name. The `specs/*` rules keep screenshot specs waiting on a `sees*()` step before `capture()`, and page robots on full-page shots. Their homes are `brand/theme/` for words, paint, measures and motion, and `domain/` or the server for rules and figures. Each plugin's `*.test.js` covers what it flags. `eslint.config.js` also bans API types in components, sorting, chained array steps, `!` and number formatting in JSX, raw `<button>`/`<input>`/`<select>` outside the kit, `vi.fn`/`vi.mock` in Vitest tests, and look checks in espresso specs, and runs the type-aware promise and nullable-number checks, `jsx-a11y` and `eslint-plugin-playwright`. A rule lands with the fixes for what it finds: no `eslint-disable` without a reason, no exemption lists. `scripts/ci/check_frontend_conventions.py` checks that every kit component has a preview and screenshot spec, every page has a robot plus screenshot and espresso specs, and every view model has a test.

### Dark Mode

Implemented via `modes.dark` in `brand/theme/tokens.ts`, generated as a `:root.dark` block that redeclares only the values that change; aliases follow them. Score, tee and scan-row colours, `--primary` and the sidebar are the same in both modes. Views take their dark look from the tokens and `dark:` variants; `useTheme()` is only for reading and setting the preference.

---

Key files:
- `src/App.tsx` — routing; wraps the app in `ScanSessionProvider` so a scan in progress outlives navigation
- `src/types/api.gen.ts` — generated from the backend's OpenAPI schema (`frontend/openapi.json`); never edit by hand. After changing an API model run `python scripts/dump_openapi.py` then `npm run gen:api`; CI fails if either is stale. `src/types/api.ts` names the generated types (`RoundDto`, `RoundSummaryDto`, …).
- `src/domain/round.ts` — the frontend `Round`: plain data mapped from the API (`Round.fromDto`; lists get the leaner `RoundSummary` from `Round.fromSummary`, which `Round` extends), plus `Round.previewEdits` / `Round.fromScan`, the only frontend golf math (live totals while editing or reviewing a scan, following the server's rules, replaced by the saved response).
- `src/lib/api.ts` — API client (`updateRound`, `cloneCourse`, `getCourses`, `searchCourses`, `getGoalReport`, `updateUser` with `scoring_goal`, etc.)
- `src/types/` holds only `api.gen.ts` and `api.ts`: every response the frontend reads is typed by a backend `response_model` and used by its `*Dto` name. Request shapes the frontend builds live in `domain/` (`AnalyticsFilters` in `domain/analyticsFilters.ts`).
- `src/domain/course.ts` / `src/domain/courseAnalytics.ts` — `CourseSummary` (list and search results) and `CourseAnalytics` (a golfer's figures at one course, with the per-hole rows the kit's hole charts take), mapped from the DTOs in the repositories. Kit components take these domain types, never DTOs.
- `src/pages/scan/` — upload → processing → setup → review → success; passes the course's holes as `course_holes` on save
- `src/pages/the-lab/` — goal picker (7 thresholds: 100/95/90/85/80/75/72), goal savers (`components/SaverCard.tsx`) and peer comparison
- `src/brand/components/RoundScorecard.tsx` — the scorecard (read-only and editable) with the To Par row

**Confidence display:** only `strokes` fields count as actionable review items (not putts/fairway/gir). Null putts shows N/A when putts weren't recorded on the card.

**Goal Engine design:**
- `scoring_goal` is stored as the threshold value (e.g. `89` means "break 90")
- "Achieved" = any single round with score ≤ `scoring_goal` (not average-based)
- `goal_report` returns `gap` (avg - goal), `on_track` bool, `rounds_meeting_goal`, `lowest_score` (the lowest full round), `peak_gap` (peak game average - goal), and ranked `savers[]`

- The frontend caches one goal report per goal (`queryKeys.goalReport(user, goal)`), so a newly picked goal shows no figures until its own report loads rather than the last goal's
- Each saver has: `type`, `strokes_saved`, `percentage_of_gap`, `headline`, `detail`, `data`

### `analytics/` — Player stats and visualizations

Implemented. Exposes per-player analytics via `api/routers/stats.py`.

- `analytics/stats.py` — all per-player stat functions (GIR, putting, scrambling, yardage buckets, score type distribution, course difficulty profile, etc.)
- `analytics/dashboard.py` — the dashboard's figures over the last 20 rounds (L20/L5 scoring averages and their change, last-5 GIR/scrambling/up-and-down/putts, handicap change, score mix, WHS breakdown, lifetime milestones, the best of the listed recent rounds, the putts shown with their rating (`putts_per_round`, `putts_rating`, rated by `insights.putts_rating`), and the score/handicap/scrambling/up-and-down trend series). `GET /stats/dashboard/{id}` sends them typed; the frontend only formats and colours them, and the dashboard never fetches the analytics payload.
- `analytics/insights.py` — the analytics page's insights: scoring, GIR and putts shifts between the earlier and later half of the rounds, the best par type, and GIR/putts averages with a `rating`. Each carries its `kind`, `category` and `trend`; the page words them. `putts_rating` (30 or fewer strong, up to 34 fair) is the one putts rating; the dashboard uses it too.
- `analytics/peak.py` — The Lab's peak game: the best three full rounds (two at least, ranked by `best_round_ranks`), their average, and birdies/bogeys/doubles a round against every round with the strokes each difference is worth (`AnalyticsResponse.peak_game`); `peak_gap` and `peak_meets_goal` against a goal for the goal report.
- `analytics/goals.py` — `goal_report(rounds, scoring_goal, home_course_rounds)` — computes gap to goal, rounds meeting it, each scored round marked met or not, the peak game's gap to it, and ranks highest-ROI improvement areas ("savers"): three-putt bleed, blowup holes, achilles heel yardage zone, home course demon hole, GIR opportunity, scrambling opportunity, par 5 opportunity
- `analytics/benchmarks.py` — The Lab's benchmarks: one table of amateur shapes by goal (and the handicap each stands for) in golf units (GIR%, scrambling%, putts per GIR, par 3/4/5 average to par); the goal nearest a peak average; a friend's shape from their rounds; and each par type's gap and ahead/even/behind verdict against a benchmark. `GET /stats/{id}/benchmark` sends it as `BenchmarkComparisonResponse`.
- The Lab reads `AnalyticsResponse` at limit 20 (`kpis.three_putts_per_round`, `three_putt_rate`, `average_putts`, `scoring_average_change`, `peak_game`), the goal report and the benchmark comparison. Only the radar's 0–100 drawing scale stays in `frontend/src/domain/radar.ts`.

## Imports

```python
from models import Course, Hole, Tee, HoleScore, Round, User, UserTee
from database import DatabaseManager, DatabasePool, SyncCourseRepositoryAdapter
from llm import extract_scorecard, ExtractionStrategy, CourseRepository
from services.scan_service import resolve_course, build_hole_scores
```
