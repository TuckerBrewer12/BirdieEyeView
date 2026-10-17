# Daily Feature Plan — 2026-10-17

## Feature: Live Round Scoring (Hole-by-Hole Entry)

**One-line description:** Let golfers track their round in real time, hole by hole on mobile, as an alternative to scanning a paper card after the fact.

---

## User Value

Right now the entire app is retrospective — you can only add a round by scanning a physical scorecard after you've finished playing. This means the app has zero presence during the 4 hours a golfer is actually on the course.

Live scoring changes the engagement model entirely:
- **Daily touchpoint**: instead of opening the app once a week to scan, users open it 18 times per round
- **Better data quality**: no OCR errors, no missing pars, no forgotten putts
- **Social hook**: friends can see in-progress rounds on the Social page
- **Goal awareness**: a running "to par" counter keeps the goal top-of-mind while playing

This is the single highest-leverage feature gap. Every other analytics page, goal engine, and stats chart depends on high-quality round data — live scoring is the cleanest possible data source.

---

## Technical Approach

### 1. Database Migration (`database/migrations/013_add_round_status.sql`)

```sql
BEGIN;

ALTER TABLE users.rounds
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'complete'
    CHECK (status IN ('complete', 'in_progress'));

CREATE INDEX IF NOT EXISTS idx_rounds_status ON users.rounds (user_id, status)
  WHERE status = 'in_progress';

COMMIT;
```

No other schema changes needed — `hole_scores` already stores individual hole data perfectly.

### 2. Backend Changes

**`api/routers/rounds.py`** — add three endpoints:

```
POST   /api/rounds/live/start         → creates round with status='in_progress'
PATCH  /api/rounds/{id}/hole          → upsert one hole score (strokes, putts, fairway, gir)
POST   /api/rounds/{id}/finish        → set status='complete', recalculate total_score
```

`start` body: `{ course_id?, tee_box?, round_date }`
`hole` body: `{ hole_number, strokes, putts?, fairway_hit?, green_in_regulation? }`

**`database/repositories/round_repo.py`** — add `upsert_hole_score(round_id, hole_number, data)` which does `INSERT ... ON CONFLICT (round_id, hole_number) DO UPDATE`.

**`api/routers/stats.py`** — filter `in_progress` rounds out of all aggregate stats (handicap, scoring average, dashboard) — add `WHERE status = 'complete'` to the existing summary queries.

### 3. Frontend Changes

**New files:**
- `frontend/src/pages/LiveScoringPage.tsx` — top-level page (route: `/rounds/live/:roundId`)
- `frontend/src/components/live-scoring/HoleEntryCard.tsx` — large +/– stroke buttons, putt stepper, FIR/GIR toggles
- `frontend/src/components/live-scoring/LiveScoreHeader.tsx` — sticky header: current hole, running total, to-par badge
- `frontend/src/components/live-scoring/CourseSetupStep.tsx` — step 1: pick course + tee (reuses existing `CourseLinkSearch` brand component)
- `frontend/src/components/live-scoring/FinishRoundSheet.tsx` — bottom sheet confirming finish

**Modified files:**
- `frontend/src/App.tsx` — add `<Route path="/rounds/live/:roundId" element={<LiveScoringPage userId={userId} />} />`
- `frontend/src/lib/api.ts` — add `startLiveRound`, `submitHoleScore`, `finishRound`
- `frontend/src/components/dashboard/ScanActionCard.tsx` — add "Start Round" button alongside the scan button
- `frontend/src/pages/RoundsPage/RoundsPage.tsx` — show in-progress rounds at top with a "Continue" badge

**UX flow:**
1. Tap "Start Round" on Dashboard → `CourseSetupStep` (optional course + tee)
2. Navigates to `/rounds/live/:roundId`
3. Full-screen `HoleEntryCard` for the current hole — large +/– for strokes, stepper for putts, toggle buttons for FIR/GIR
4. "Next Hole" submits the score to `PATCH /api/rounds/{id}/hole` and advances (holes 1–18)
5. After hole 18: `FinishRoundSheet` confirms, calls `POST /api/rounds/{id}/finish`
6. Redirects to `/rounds/:roundId` (existing RoundDetailPage)

**State management:** a lightweight `useLiveRound` hook persists `currentHole` and optimistically batches writes, falling back to localStorage if the user goes offline mid-round.

---

## Estimated Complexity

**Large** — 3–4 days of focused work across backend + frontend. The schema migration and API layer are straightforward (~2h). The bulk of the effort is the mobile-optimized UI: large tap targets, swipe between holes, offline resilience, and the running score header.

Phasing suggestion:
- **Day 1**: Migration + 3 API endpoints + `api.ts` additions
- **Day 2**: `HoleEntryCard` + `LiveScoreHeader` + basic page wiring
- **Day 3**: `CourseSetupStep`, `FinishRoundSheet`, dashboard entry point
- **Day 4**: Offline fallback, in-progress badge in Rounds list, polish

---

## Acceptance Criteria

- [ ] User can tap "Start Round" on the Dashboard and optionally select a course and tee box before beginning
- [ ] Hole entry screen shows large +/– stroke buttons, a putt count stepper, and FIR/GIR toggle buttons; submitting a hole score persists it immediately to the backend
- [ ] A sticky header displays the current hole number, running total score, and to-par badge at all times during entry
- [ ] "Finish Round" marks the round complete, recalculates `total_score`, and redirects to the round detail page
- [ ] In-progress rounds appear at the top of the Rounds list with a distinguishing "In Progress" badge and a "Continue" CTA, and are excluded from all handicap and stat calculations until finished
