# Daily Feature Plan — 2026-09-12

## Feature: Goal Dashboard Page (`/goals`)

**One-line description:** A dedicated, motivational goal-tracking page that assembles the already-built Goal Engine into a cohesive experience — surfacing progress toward a scoring target and ranked, actionable improvement areas.

---

## User Value

"Breaking 90" (or 80, or 72) is the #1 stated motivation of amateur golfers. The app already computes everything needed to help users get there — gap analysis, ranked savers, round history — but these live scattered across TheLabPage, the Dashboard widget, and an API endpoint that has no first-class home in the UI.

A dedicated `/goals` page gives users:
- A single place to set or update their scoring goal
- Live progress: how far they are from the goal, and whether they're trending toward it
- Ranked "savers" — the highest-ROI things to practice (3-putt reduction, blowup avoidance, par 5 conversion, etc.), each with a headline and concrete drill context
- A clear answer to: *"What should I work on before my next round?"*

This turns the app from a logbook into a coaching tool, dramatically increasing return visits.

---

## Technical Approach

### Backend (already complete — no changes needed)
- `GET /api/stats/{user_id}/goal-report?limit=` — returns `gap`, `on_track`, `savers[]`
- `PUT /api/users/{id}` with `scoring_goal` — already wired in `UpdateUserRequest`
- `GoalReport` + `GoalSaver` types already in `src/types/analytics.ts`
- `GoalSaverCard` component already in `src/components/goals/GoalSaverCard.tsx`
- `getGoalReport` + `updateUser` already in `src/lib/api.ts`

### Frontend — files to create/change

**New file: `frontend/src/pages/GoalsPage.tsx`**
Main page shell. Sections:
1. **Goal Hero** — current goal pill + circular progress ring (rounds at/below goal vs. total recent rounds). Uses existing `ProgressRing` from `the-lab/` or a new inline SVG.
2. **Goal Selector** — 7 thresholds (100/95/90/85/80/75/72). Selecting a threshold calls `updateUser({ scoring_goal: threshold - 1 })` and refreshes the report. Persist the selected threshold visually.
3. **Gap Summary** — `gap` value (avg score vs. goal), `on_track` boolean, a sparkline of recent scores vs. goal line. Can reuse the score trend pattern from `dashboard/ScoreAndHandicapTrend.tsx`.
4. **Savers Bento Grid** — maps `savers[]` through `GoalSaverCard`. Each card already renders type, `strokes_saved`, `percentage_of_gap`, `headline`, `detail`. 2-col grid on desktop, 1-col on mobile.
5. **Empty state** — "Scan your first round to unlock your goal report" if no rounds.

**New file: `frontend/src/components/goals/GoalHero.tsx`**
Circular progress ring + goal display (e.g. "Breaking 90 · 3.2 strokes away"). SVG ring, framer-motion entrance. Color: `#2d7a3a` on track, `#ef4444` off track.

**Modified: `frontend/src/App.tsx`**
- Add `import GoalsPage from './pages/GoalsPage'`
- Add route: `<Route path="/goals" element={<GoalsPage />} />`

**Modified: `frontend/src/components/layout/Sidebar.tsx`** (and `BottomNav.tsx`)
- Add "Goals" nav item with a target/flag icon, pointing to `/goals`
- Position between "The Lab" and "Social" in nav order

**Modified: `frontend/src/pages/DashboardPage.tsx`**
- The existing goal widget (`lg:col-span-2`) should link to `/goals` — add a "See full report →" CTA if not already present.

### No DB migration needed
`scoring_goal` (migration 003) and all goal-related columns are already live.

---

## Estimated Complexity: **Medium**

- All backend logic exists and is tested
- `GoalSaverCard`, `getGoalReport`, `updateUser`, `GoalReport` types all exist
- Work is primarily UI assembly: ~250–350 lines of new TSX across 2 new files + 3 small edits
- No new API endpoints, no schema changes
- Risk: `GoalSaverCard` may need minor prop adjustments to fit the new layout; the `ProgressRing` may need to be built from scratch (~50 lines SVG) if TheLabPage's version isn't reusable

---

## Acceptance Criteria

- [ ] Navigating to `/goals` shows the page without errors for a user with at least one round
- [ ] Selecting a goal threshold (e.g. "Break 90") persists via `updateUser` and refreshes the savers grid
- [ ] The gap summary correctly reflects the user's average score vs. their goal across recent rounds
- [ ] At least 3 GoalSaverCards render with meaningful headlines when the user has sufficient round data
- [ ] The page is fully responsive: single-column on mobile (≤768px), two-column savers grid on desktop
- [ ] Empty state renders gracefully for users with zero rounds or no goal set
- [ ] "Goals" link appears in the sidebar and bottom nav and is highlighted when active
