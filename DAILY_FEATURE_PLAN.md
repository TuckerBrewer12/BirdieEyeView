# Daily Feature Plan — 2026-10-18

## Feature: Live Round Entry (Hole-by-Hole Scorecard)

**One-line description:** Let golfers enter scores during a round, hole by hole, with auto-save — no scanning required.

---

## User Value

Right now the only way to add a round is to scan a finished paper scorecard with the Gemini AI. That creates a hard constraint: you need a legible physical card and a post-round workflow step. Many golfers:

- Play without a physical card (casual rounds, walking solo)
- Want to see live stats as they play — putts-per-hole trends, running score vs. par
- Don't want to wait until they get home to add their round

Live Round Entry turns the app into the scorecard itself. Players open it on the first tee, pick a course, and tap in each hole's score, putts, fairway, and GIR as they finish each hole. The round saves automatically, appears in analytics and goal tracking immediately on the last hole, and is indistinguishable from a scanned round to the rest of the system.

---

## Technical Approach

### 1. DB Migration — `database/migrations/013_add_round_status.sql`

```sql
ALTER TABLE users.rounds
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed'
  CHECK (status IN ('in_progress', 'completed'));

CREATE INDEX IF NOT EXISTS idx_rounds_status ON users.rounds (status);
```

- Existing rows default to `'completed'` — zero breaking change.
- `in_progress` rounds are excluded from analytics queries (partially scored rounds skew averages).
- Only `finished` rounds feed stats endpoints in `api/routers/stats.py` and `analytics/stats.py`.

### 2. Backend

**`api/routers/rounds.py`** — three new endpoints:

```
POST   /api/rounds/start         # create blank in_progress round, return round_id
PATCH  /api/rounds/{id}/hole     # upsert a single hole_score (hole_number + strokes + optional putts/fairway/gir)
POST   /api/rounds/{id}/finish   # set status=completed, compute total_score
```

- `POST /start` accepts `{ user_id, course_id?, tee_box?, round_date }` and creates the round shell.
- `PATCH /hole` uses INSERT … ON CONFLICT(round_id, hole_number) DO UPDATE to keep the round incrementally correct. Uses existing `build_hole_scores` logic from `services/scan_service.py`.
- `POST /finish` sets `status = 'completed'` and recalculates `total_score` (same logic already in `PUT /api/rounds/{id}`). Returns the full round.

**`database/repositories/round_repo.py`** — add `create_round_shell`, `upsert_hole_score`, and `finish_round` methods. `get_rounds` already needs a filter: exclude `in_progress` rounds from list and stats queries, or expose them with a `?include_in_progress=true` flag.

### 3. Frontend — new `LiveScorecardPage`

**New files:**
- `frontend/src/pages/LiveScorecardPage.tsx` — page shell (responsive, like TheLabPage)
- `frontend/src/hooks/useLiveScorecardViewModel.ts` — all state + API calls
- `frontend/src/components/live-scorecard/HoleInputCard.tsx` — primary input card for current hole
- `frontend/src/components/live-scorecard/LiveScoreRow.tsx` — compact running scorecard row per hole
- `frontend/src/components/live-scorecard/LiveSummaryBar.tsx` — sticky bottom bar: total strokes, to-par, holes remaining

**Flow:**
1. Entry from Dashboard (new "Start Round" button) or `/live` route.
2. Course picker (reuse existing `CourseSearch` component from ScanPage).
3. Hole cards swipe left/right (or tap Next/Back). Each card shows: hole number, par, yardage if course known, and inputs for strokes + optional putts/fairway/GIR.
4. Auto-save on every hole input via `PATCH /api/rounds/{id}/hole` (debounced 500ms).
5. After hole 18 (or any hole the user taps "Finish"), call `POST /finish` and navigate to the round detail page.
6. An "in progress" pill badge on the Rounds list page and Dashboard for any pending round.

**Routing:** add `/live` and `/live/:roundId` to `src/App.tsx`.

**`src/lib/api.ts`** — add `startRound`, `upsertHoleScore`, `finishRound` calls.

### 4. Files to Change

| File | Change |
|---|---|
| `database/migrations/013_add_round_status.sql` | New migration |
| `database/schema.sql` | Add status column to rounds table definition |
| `database/repositories/round_repo.py` | `create_round_shell`, `upsert_hole_score`, `finish_round` |
| `api/routers/rounds.py` | 3 new endpoints; filter in_progress from list |
| `analytics/stats.py` | Exclude in_progress rounds from all stat aggregations |
| `api/request_models.py` | `StartRoundRequest`, `UpsertHoleScoreRequest` Pydantic models |
| `models/round.py` | Add optional `status` field |
| `frontend/src/lib/api.ts` | `startRound`, `upsertHoleScore`, `finishRound` |
| `frontend/src/App.tsx` | Add `/live` routes |
| `frontend/src/pages/DashboardPage.tsx` | "Start Round" CTA |
| `frontend/src/pages/RoundsPage/RoundsPage.tsx` | In-progress pill badge |
| `frontend/src/pages/LiveScorecardPage.tsx` | **New** |
| `frontend/src/hooks/useLiveScorecardViewModel.ts` | **New** |
| `frontend/src/components/live-scorecard/HoleInputCard.tsx` | **New** |
| `frontend/src/components/live-scorecard/LiveScoreRow.tsx` | **New** |
| `frontend/src/components/live-scorecard/LiveSummaryBar.tsx` | **New** |

---

## Estimated Complexity

**Large** — roughly 3–4 days of focused work. The backend additions are incremental and low-risk. The frontend is the bulk: a mobile-first input UI that must feel responsive and forgiving on a phone held in one hand on a golf course. The trickiest part is the `in_progress` filtering to avoid corrupting analytics for partial rounds.

---

## Acceptance Criteria

- [ ] A golfer can tap "Start Round" on the Dashboard, pick a course (or skip), and get a blank in-progress round with a unique ID and `/live/:roundId` URL.
- [ ] Entering a score on any hole saves it immediately (visible on refresh); no explicit "save" button needed.
- [ ] Tapping "Finish Round" on the 18th hole (or any earlier hole) marks the round `completed` and redirects to the Round Detail page with all hole scores and correct total.
- [ ] In-progress rounds are hidden from the Rounds list, analytics, and goal tracking; a banner/badge surfaces the active round so it can be resumed.
- [ ] A round started via Live Entry is indistinguishable from a scanned round in analytics, stats, and the goal engine once completed.
