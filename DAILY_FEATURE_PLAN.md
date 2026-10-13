# Daily Feature Plan — 2026-10-13

## Feature: Manual Round Entry

**One-line description:** Let users log a complete golf round by hand — hole-by-hole — without needing a scannable scorecard image.

---

## User Value

Right now the only way to create a round is to photograph a physical scorecard and run it through the Gemini OCR pipeline. This hard dependency blocks a large slice of real usage:

- Golfers who score on a GPS watch or phone app and never receive a paper card.
- Golfers who lost or forgot their card after the round.
- Golfers who want to retroactively enter older rounds from memory or a photo-less record.
- Users onboarding who want to populate their history before their first scan.

Manual entry removes the single biggest onboarding friction point. More rounds in the DB directly increases the value of every analytics and goal feature already built.

---

## Technical Approach

### Backend

**New endpoint: `POST /api/rounds`** (`api/routers/rounds.py`)

```
POST /api/rounds
Body: {
  user_id, round_date, course_id (optional), tee_color (optional),
  course_name_played (optional, fallback when no course_id),
  hole_scores: [{ hole_number, strokes, putts?, fairway_hit?, green_in_regulation?, par_played }]
}
Response: Round (same shape as scan/save response)
```

- Reuse `build_hole_scores()` from `services/scan_service.py` — it already handles `par_played` population from course holes.
- Mirror the save logic in `api/routers/scan.py` (`/api/scan/save`) — same DB writes, same `round_repo.create_round` + `round_repo.save_hole_scores` calls.
- No new DB migration required; the `rounds` + `hole_scores` schema already supports all fields.
- Add `create_round_manual()` method to `database/repositories/round_repo.py` or reuse the existing `create_round()`.

### Frontend

**New page: `src/pages/ManualEntryPage.tsx`**

Multi-step flow (mirrors ScanPage structure for consistency):

1. **Step 1 — Course & Date**: Date picker, course search (reuse existing `searchCourses` API call from `src/lib/api.ts`), tee color selector. "No course" option populates `course_name_played`.
2. **Step 2 — Scorecard Grid**: Editable 18-hole (or 9-hole) grid. Columns: Hole, Par, Strokes, Putts (optional). Uses the same grid layout as `ScorecardGrid.tsx` but with `<input>` cells instead of read-only cells.
3. **Step 3 — Review & Save**: Summary card (score, to-par), then save. On success → navigate to `RoundDetailPage`.

**Files to create:**
- `src/pages/ManualEntryPage.tsx`
- `src/components/manual-entry/ManualScorecardGrid.tsx` — editable grid
- `src/components/manual-entry/CourseSearchStep.tsx` — step 1 form

**Files to modify:**
- `src/lib/api.ts` — add `createRound(payload)` function
- `src/App.tsx` — add `/rounds/new` route pointing to `ManualEntryPage`
- `src/pages/RoundsPage/RoundsPage.tsx` — add "Log a Round" button linking to `/rounds/new`
- `src/pages/DashboardPage.tsx` — add "Log Manually" action alongside the scan action card
- `api/routers/rounds.py` — add POST handler
- `api/request_models.py` — add `CreateRoundRequest` and `HoleScoreInput` models

### No DB migration needed

All required columns already exist in `users.rounds` and `users.hole_scores`.

---

## Estimated Complexity

**Medium** — ~2–3 days of focused work.

- Backend endpoint: ~4 hours (model, endpoint, tests)
- ManualScorecardGrid component: ~6 hours (editable grid, keyboard nav, validation)
- Full page + routing: ~4 hours
- Integration tests: ~2 hours

---

## Acceptance Criteria

- [ ] `POST /api/rounds` creates a round and 9 or 18 hole_scores; response is a valid `Round` object with `total_score` and `to_par` populated.
- [ ] The manual entry flow is reachable from the Dashboard ("Log a Round" card) and the Rounds list page ("+ New Round" button).
- [ ] A user can complete a round entry for a known course (fetched via course search) and the resulting `RoundDetailPage` shows the correct scorecard, including par-relative score type colors per hole.
- [ ] A user can complete a round entry with no linked course (entering `course_name_played` as a free-text field), and analytics are calculated from the `par_played` values they entered per hole.
- [ ] Strokes field rejects non-numeric input and values outside 1–20; the grid prevents saving until all 9 or 18 strokes fields are filled.
