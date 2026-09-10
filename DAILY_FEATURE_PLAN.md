# Daily Feature Plan — 2026-09-10

## Feature: Dedicated Goals & Progress Page (`/goals`)

**One-line description:** A full-page goal tracking hub where golfers set a scoring target, visualize their gap to it, and see ranked savers — surfacing work that is already 100% built on the backend but buried in a single dashboard widget.

---

## User Value

A golfer opens the app every week to track progress toward breaking 90 (or 80, or 100). Right now they set a `scoring_goal` in Settings and get a single widget on the Dashboard showing a progress bar and one saver card. The widget is informative but not motivating — it doesn't show history, it doesn't let them explore the full saver breakdown, and it doesn't answer "am I getting closer?"

A dedicated `/goals` page turns a data-point into a story:
- "My gap to breaking 85 has shrunk from 7.2 strokes to 4.1 over the last 12 rounds."
- "Three-putt bleed is my #1 lever — eliminating one three-putt per round saves me 2.3 strokes."
- "My closest round was 87 on August 3rd — I need to put together a round like that again."

This is the feature gap that most directly affects solo-user retention. Every single user benefits on day one; no friends required.

---

## Technical Approach

### Backend — No changes needed

All data is already served by `GET /api/stats/{user_id}/goal-report?limit=N`.

The response shape (from `src/types/analytics.ts` `GoalReport`) includes:
- `scoring_goal`, `current_average`, `gap`, `on_track`
- `savers[]` — ranked `GoalSaver` objects with `type`, `strokes_saved`, `percentage_of_gap`, `headline`, `detail`, `data`

The only potential backend addition is a lightweight "history" endpoint to power a gap-over-time chart (optional stretch goal):
- `GET /api/stats/{user_id}/goal-history?limit=30` — returns one row per round: `{ round_id, date, score, gap_to_goal }`
- Can be computed in `analytics/goals.py` using existing round data.

### Frontend — Files to create/modify

**New file: `frontend/src/pages/GoalsPage.tsx`**

Sections (top to bottom):

1. **Hero header** — current goal threshold pill (e.g. "Break 90"), `on_track` badge (green "On Track" / amber "Needs Work"), big gap number (`4.1 strokes behind`).

2. **Goal Selector** — reuse the 7-threshold picker already in `SuggestionsPage.tsx` (thresholds: 72/75/80/85/90/95/100). Updating it PATCHes `scoring_goal` via `updateUser()` from `src/lib/api.ts`.

3. **Gap Trend Chart** — SVG area/line chart plotting score vs. goal line over last N rounds. Uses `SVGScoreHandicapTrend` as a reference pattern. Each dot colored by score-type palette. Hoverable tooltip shows date, score, course.
   - Data source: either the new `goal-history` endpoint or derived from existing round list.

4. **Milestone Row** — 3 stat pills: "Best Round" (closest to goal), "Last Achieved" (last round ≤ goal, or "—"), "Rounds Analyzed".

5. **Top Savers Grid** — full `GoalSaver[]` list rendered as `GoalSaverCard` components, reusing the component from `src/components/goals/GoalSaverCard.tsx`. Show all savers (not just top 1 like the dashboard widget). Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`.

6. **Detail Drawer** (stretch) — clicking a saver card expands a bottom sheet with the `data` payload rendered as a mini chart (e.g. three-putt frequency by hole, yardage zone scatter).

**Modified: `frontend/src/App.tsx`**
- Import `GoalsPage`.
- Add route: `<Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />`.

**Modified: `frontend/src/components/layout/Sidebar.tsx`** (desktop)
- Add "Goals" nav item between Analytics and The Lab.
- Icon: `Target` from `lucide-react`.

**Modified: `frontend/src/components/layout/BottomNav.tsx`** (mobile)
- Add Goals to the "More" drawer (alongside Career, Social).
- Same `Target` icon.

**Modified: `frontend/src/components/dashboard/GoalWidget.tsx`** (or equivalent dashboard card)
- Add "View full goals →" link pointing to `/goals`.

**Modified: `frontend/src/lib/api.ts`** (if gap-history endpoint is added)
- Add `getGoalHistory(userId: number, limit?: number): Promise<GoalHistoryPoint[]>`.

**New file: `frontend/src/types/analytics.ts`** addition
- `GoalHistoryPoint` type (if gap-history endpoint added).

### DB Migration — None required

All data lives in existing `users.rounds` and `users.hole_scores` tables. No schema changes needed.

---

## Estimated Complexity

**Medium**

- ~300–400 lines of new TSX for `GoalsPage.tsx`
- ~40 lines across 3 modified files (App.tsx, Sidebar, BottomNav)
- SVG gap trend chart is the only technically nuanced piece (uses existing project patterns)
- Optional backend `goal-history` endpoint adds ~50 lines of Python
- No DB migrations, no new API contracts (backend data already flows)

---

## Acceptance Criteria

- [ ] `/goals` route is accessible from sidebar (desktop) and More drawer (mobile); page renders the current `scoring_goal` threshold and `gap` value from the API.
- [ ] Goal selector updates `scoring_goal` via PATCH and immediately refreshes the gap and saver data without a full page reload.
- [ ] Gap trend chart renders one data point per round (up to last 20) with the goal score as a horizontal reference line; hovering a point shows date, score, and course name.
- [ ] All `savers[]` returned from `/api/stats/{user_id}/goal-report` are rendered as `GoalSaverCard` components in a responsive grid; the layout matches the app's existing card design system (`rounded-2xl`, `shadow-sm`, `border-gray-100`).
- [ ] Dashboard goal widget includes a "View full goals →" link that navigates to `/goals`; the page is fully functional when `scoring_goal` is null (shows the selector with a prompt to pick a goal).
