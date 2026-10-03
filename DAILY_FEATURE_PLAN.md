# Daily Feature Plan — 2026-10-03

## Feature: Live In-Round Scoring

**One-line description:** A hole-by-hole digital scorekeeper that lets golfers enter scores as they play — no camera required, no post-round scanning delay.

---

## User Value

The scan flow is a post-round tool. Golfers stand on the 1st tee with their phone and currently have nothing to do until they finish, find a physical scorecard to photograph, wait for LLM extraction, and review it. This leaves an entire use case uncovered: **scoring in real time while you play**.

Live scoring means:
- Every round gets captured, even courses that don't print scorecards or when lighting/quality makes scanning fail.
- Golfers see their running total, to-par, and putts in real time — motivating feedback mid-round.
- The data flows straight into the existing analytics engine (The Lab, goal tracking, peer comparison) the moment the round is finished.
- Friends can follow each other's live rounds (foundation for a social feed).

This is the single most-played golf app feature category on mobile — it completes the app's core loop.

---

## Technical Approach

### Database Migration (`database/migrations/013_active_rounds.sql`)
```sql
ALTER TABLE users.rounds
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('active', 'completed'));

CREATE INDEX IF NOT EXISTS idx_rounds_status ON users.rounds (status);
```

Existing rounds default to `'completed'`; no data migration needed.

### Backend

**`api/routers/rounds.py`** — add two endpoints:
- `POST /api/rounds/start` — creates a new round with `status='active'`, accepts `course_id`, `tee_box`, optional `total_holes`; returns the new round with empty hole scores. Reuses existing `insert_round` DB path.
- `POST /api/rounds/{id}/hole-scores` — upserts a single `HoleScore` for the active round (already possible via `update_hole_scores`; expose it as a clean REST endpoint).
- `POST /api/rounds/{id}/finish` — sets `status='completed'`, runs `total_score` recalc, returns the completed round.

**`api/request_models.py`** — add `StartRoundRequest` (course_id optional, tee_box optional, total_holes default 18) and `HoleScoreEntryRequest` (hole_number, strokes, putts, fairway_hit, gir).

**`database/repositories/round_repo.py`** — add `get_active_round_for_user(user_id)` so the app can resume a round in progress (one active round per user at a time).

### Frontend

**`src/pages/LiveScoringPage.tsx`** — main scorekeeper page. Shows current hole with a large strokes stepper (+/−), putts stepper, and fairway/GIR toggles. Swipe/tap navigation between holes. Running scoreboard at top (total, to-par).

**`src/components/live-scoring/HoleEntryCard.tsx`** — single-hole entry widget: par badge, strokes stepper, putts stepper, fairway/GIR toggles. Auto-saves each hole on next-hole advance via the new `POST /api/rounds/{id}/hole-scores` endpoint.

**`src/components/live-scoring/RunningScoreboard.tsx`** — compact header showing score, to-par, holes played, and a mini sparkline of this round's score vs par so far.

**`src/components/live-scoring/FinishRoundModal.tsx`** — confirmation modal on hole 18 (or manual "Finish" tap) that shows the final scorecard summary and a "Save & Finish" button.

**`src/lib/api.ts`** — add `startRound()`, `saveHoleScore()`, `finishRound()`, `getActiveRound()` API client methods.

**`src/App.tsx`** — add `/live` route for `LiveScoringPage`; check for active round on app load and surface a "Resume round" banner on the Dashboard.

**`src/components/scan/ScanUploadStep.tsx`** — add a third mode card alongside "Capture Card" and "Manual Entry": **"Live Scoring"** (icon: play button) that navigates to `/live`.

**`src/pages/DashboardPage.tsx`** — add a "Resume Round" widget (shows hole-in-progress, current score) when an active round exists for the user.

### No new models needed
`Round` and `HoleScore` pydantic models already handle everything. The only change is `Round` gaining an optional `status: Optional[str]` field (defaults to `'completed'`).

---

## Estimated Complexity

**Medium** — 1 DB migration, 3 new API endpoints + 2 request models, 5 new frontend files + changes to 4 existing. No new external services. Builds entirely on existing `Round`/`HoleScore` infrastructure.

---

## Acceptance Criteria

- [ ] A logged-in user can tap "Live Scoring" on the Scan page and start a new round (with or without a pre-selected course); the round appears in their rounds list with status `active`.
- [ ] The user can advance hole-by-hole, entering strokes and putts; each hole auto-saves immediately; closing the browser and returning resumes the in-progress round at the last hole entered.
- [ ] The running scoreboard updates in real time showing total strokes and strokes vs par as holes are completed.
- [ ] Tapping "Finish Round" marks the round `completed`, calculates `total_score`, and redirects to the Round Detail page — the round flows into The Lab and goal tracking immediately.
- [ ] The Dashboard shows a "Resume Round" card whenever an active round exists, linking directly back to the live scorekeeper at the current hole.
