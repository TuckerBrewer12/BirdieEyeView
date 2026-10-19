# Daily Feature Plan — 2026-10-19

## Feature: Live Round Entry (Hole-by-Hole Scoring)

**One-line description:** A mobile-first flow that lets golfers enter scores hole-by-hole during an actual round, with real-time to-par tracking and auto-save.

---

## User Value

Right now every round in ScanScorecards must be recorded by scanning a physical card *after* the fact. That workflow requires good lighting, a readable card, and remembering to scan later. It also means golfers never see live stats while they play.

Hole-by-hole live entry closes this gap:
- Golfers with no physical card (e.g. walking a casual 9 holes) can still track rounds.
- Stats update in real time: current score, to-par, running putt count.
- A bad scan image is no longer the only way to lose data — manual entry is always accurate.
- The existing iOS Capacitor app is the natural home for a tap-friendly mobile scorer.

Live round entry is the feature most likely to turn occasional users into daily-active ones, because it creates a usage event every time they play — not just when they remember to scan.

---

## Technical Approach

### Backend

1. **New endpoint: `POST /api/rounds`** (`api/routers/rounds.py`)
   - Accepts `user_id`, optional `course_id`, `tee_box`, `course_name_played`, `date_played`.
   - Creates a bare round row (no hole scores yet) and returns the `round_id`.
   - Reuses `db.rounds.create_round()` (already exists in `database/repositories/round_repo.py:285`).

2. **Patch endpoint already exists:** `PUT /api/rounds/{round_id}` accepts `hole_scores[]` — no changes needed to record individual holes as the golfer completes them.

3. **No DB migration required.** The `users.rounds` and `users.hole_scores` schema already holds every field needed (`strokes`, `putts`, `par_played`, `fairway_hit`, `green_in_regulation`). Partial rounds (< 18 hole scores) are already valid.

### Frontend

4. **New page: `frontend/src/pages/LiveRoundPage.tsx`**
   - Route: `/rounds/live`
   - Step 1 — Setup: course search (existing `searchCourses` API), tee selection, date.
   - Step 2 — Scoring: one hole at a time. Tap +/- for strokes, optional putts/FIR/GIR toggles.
   - Step 3 — Summary: final scorecard review before saving (reuses `ScorecardGrid`).
   - Auto-saves after each hole via `PUT /api/rounds/{id}`.

5. **New hook: `frontend/src/hooks/useLiveRound.ts`**
   - Manages current hole index, running totals, optimistic UI state.
   - Debounced save to prevent rapid-fire API calls.
   - `localStorage` draft so a refreshed tab or app restart resumes mid-round.

6. **Dashboard shortcut:** Add a "Start Round" CTA button in `DashboardPage.tsx` (currently the dashboard has no primary action — this gives first-time users an obvious entry point).

7. **Rounds list badge:** In `RoundsPage`, visually distinguish rounds entered manually vs. scanned (a small "⌨ Manual" vs. "📷 Scanned" tag on each row). Add `entry_method` column — see migration below.

### DB Migration (optional, low priority)

8. **`database/migrations/013_add_entry_method.sql`**
   ```sql
   ALTER TABLE users.rounds
     ADD COLUMN IF NOT EXISTS entry_method VARCHAR(20) DEFAULT 'scan'
       CHECK (entry_method IN ('scan', 'manual'));
   ```
   Not a blocker — the feature works without it. Add in a follow-up if the distinction matters for analytics.

### New / Changed Files

| File | Action |
|---|---|
| `api/routers/rounds.py` | Add `POST /` handler (create bare round) |
| `frontend/src/pages/LiveRoundPage.tsx` | New page |
| `frontend/src/hooks/useLiveRound.ts` | New hook |
| `frontend/src/lib/api.ts` | Add `createRound()` helper |
| `frontend/src/App.tsx` | Register `/rounds/live` route |
| `frontend/src/pages/DashboardPage.tsx` | Add "Start Round" CTA |
| `database/migrations/013_add_entry_method.sql` | Optional: distinguish scan vs manual |

---

## Estimated Complexity

**Medium** — ~2–3 days of focused work.
- Backend: ~50 lines (one new endpoint + minor route registration).
- Frontend: ~300–400 lines across new page + hook; mostly UI state management.
- No schema migration required for the core feature.
- No new dependencies needed.

---

## Acceptance Criteria

- [ ] A golfer can start a new round from the dashboard, select a course (or enter a name freeform), and be taken to a per-hole entry UI.
- [ ] After completing each hole, the score is auto-saved to the database; closing and reopening the app resumes the in-progress round from `localStorage` state.
- [ ] Running total score and to-par are visible at all times during entry.
- [ ] On the final hole, a "Finish Round" action shows the full scorecard summary (using the existing `ScorecardGrid` component) before committing.
- [ ] The finished round appears in Rounds list and Round Detail with the correct hole scores, total, and stats — identical to a scanned round.
