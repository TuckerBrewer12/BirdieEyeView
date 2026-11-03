# Daily Feature Plan — 2026-11-03

## Feature: Live In-Progress Round Scoring

**One-line description:** Let golfers enter scores hole-by-hole on their phone during a round, auto-saving as they play, so the app is useful on the course — not just after.

---

## User Value

Right now every round enters the system retroactively: golfer finishes, finds the paper scorecard, scans it. This works, but it locks the app out of the most natural moment to capture data — *while playing*.

Live scoring changes that:
- The app becomes the scorecard. No paper needed.
- Stats update in real time after each hole.
- Players who never use paper scorecards (growing share) get full analytics coverage.
- A round in progress creates a natural reason to open the app repeatedly, driving retention.
- The existing analytics engine, goals, and The Lab all work immediately on live-entered rounds with zero changes — the data model is identical to scanned rounds.

---

## Technical Approach

### Database — Migration 013

Add a `status` column to `users.rounds` to distinguish draft (in-progress) from completed rounds:

```sql
-- database/migrations/013_live_scoring_status.sql
BEGIN;
ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS status VARCHAR(20)
        NOT NULL DEFAULT 'completed'
        CHECK (status IN ('draft', 'completed'));

CREATE INDEX IF NOT EXISTS idx_rounds_status_user
    ON users.rounds (user_id, status)
    WHERE status = 'draft';
COMMIT;
```

Completed rounds (including all existing scanned rounds) default to `'completed'` — no data migration needed.

### Backend

**New / changed files:**

1. **`api/routers/rounds.py`** — add two new endpoints:

   - `POST /api/rounds/start` — creates a `status='draft'` round with a course + tee selection. Returns the new `round_id` the client uses for all subsequent hole-score upserts.
   - `POST /api/rounds/{id}/complete` — sets `status='completed'`, recalculates `total_score` / `total_putts`, and returns the finished round. Idempotent.

2. **`api/routers/rounds.py`** — existing `PUT /api/rounds/{id}/hole-scores` already handles batch upsert; expose `PUT /api/rounds/{id}/hole-scores/{hole_number}` for single-hole upsert so the client doesn't have to resend all 18 holes on every tap.

3. **`database/repositories/round_repo.py`** — add `upsert_single_hole_score(round_id, hole_number, strokes, putts, fairway, gir)` and `set_round_status(round_id, status)` helpers.

4. **`api/routers/rounds.py`** — filter draft rounds out of the default list/dashboard unless the requesting user owns them and passes `?include_drafts=true`. This keeps analytics clean.

5. **`api/request_models.py`** — add `StartRoundRequest` (course_id, tee_box, round_date) and `HoleScoreEntryRequest` (strokes, putts, fairway_hit, gir).

### Frontend

**New files:**

- **`src/pages/LiveScoringPage.tsx`** — main live-round view. Driven by `useLiveScoringViewModel`.
- **`src/hooks/useLiveScoringViewModel.ts`** — manages round state, hole navigation, auto-save on each stroke change.
- **`src/components/live-scoring/HoleScorecardEntry.tsx`** — per-hole entry widget: large +/− stroke buttons, optional putts/fairway/GIR toggles, hole par/yardage displayed from linked course.
- **`src/components/live-scoring/LiveRoundSummaryBar.tsx`** — sticky bottom bar: current score vs. par, holes played / remaining, "Finish Round" CTA.
- **`src/components/live-scoring/CourseAndTeeSelector.tsx`** — step 1 of the flow: pick course + tee box before starting. Reuses existing `searchCourses` API.

**Changed files:**

- **`src/App.tsx`** — add `/round/live` and `/round/live/:roundId` routes.
- **`src/lib/api.ts`** — add `startRound()`, `upsertHoleScore()`, `completeRound()`.
- **`src/pages/DashboardPage.tsx`** — surface a "Resume Round" banner if a draft round exists for the current user.
- **`src/components/layout/`** — add "Start Round" quick-action button in the sidebar/nav alongside "Scan".

**UX flow:**

```
Sidebar "Start Round" →
  CourseAndTeeSelector (search + pick course, pick tee color) →
  POST /api/rounds/start → roundId returned →
  HoleScorecardEntry (hole 1 of 18, auto-advance on save, back nav allowed) →
    PATCH /api/rounds/{id}/hole-scores/1 on each change (debounced 800 ms) →
  "Finish Round" (after hole 18 or manually) →
  POST /api/rounds/{id}/complete →
  RoundDetailPage (existing, unchanged)
```

Draft rounds persist across app restarts — if a user closes the app mid-round, the "Resume Round" banner on the Dashboard lets them pick up where they left off.

---

## Estimated Complexity

**Medium**

- Backend: ~150 lines net new (2 endpoints, 2 repo helpers, 1 migration). No new dependencies.
- Frontend: ~400 lines across 5 new files + small changes to 3 existing files. The most complex piece is the debounced auto-save and the hole navigation state machine; both are self-contained in the view model.
- No new external services required — same DB, same auth, same analytics pipeline.

---

## Acceptance Criteria

- [ ] A user can tap "Start Round", pick a course and tee, and be presented with a hole-by-hole entry UI beginning at hole 1.
- [ ] Stroke count changes auto-save to the backend within 1 second (debounced); the user never has to tap a "Save" button mid-round.
- [ ] If the user closes the app and returns, the Dashboard shows a "Resume Round" card that navigates back to the correct hole.
- [ ] After tapping "Finish Round", the completed round appears in the rounds list, Dashboard, and analytics with the same fidelity as a scanned round.
- [ ] Existing scanned rounds and all analytics are unaffected — `status='draft'` rounds are excluded from stats until completed.
