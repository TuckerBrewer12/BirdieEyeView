# Daily Feature Plan — 2026-10-21

## Feature: Live Scoring Mode

**One-line description:** Track your round hole-by-hole in real time on the course, instead of scanning a completed card afterward.

---

## User Value

Right now the app is a **post-round tool** — you play, fill out a paper card, then scan it when you get home. That means zero engagement during the ~4 hours a golfer is actually on the course.

Live Scoring changes that. A golfer opens the app on the first tee, selects the course and tee box, and taps in their score after each hole. By hole 9 they already see running stats: to-par, putting average, GIR rate. They finish the round, tap "Done", and the round is saved instantly — no paper card, no scan, no waiting.

This dramatically increases the number of app-opens per round (18 hole inputs vs 1 post-round scan) and makes ScanScorecards the primary companion on the course, not a logging utility afterward.

---

## Technical Approach

### New Files

| File | Purpose |
|---|---|
| `frontend/src/pages/LiveRoundPage.tsx` | Main page for in-round scoring; step-through hole-by-hole UI |
| `frontend/src/hooks/useLiveRound.ts` | State machine: `idle → selecting_course → hole_N → finished` |
| `frontend/src/components/live-round/HoleScoringCard.tsx` | Per-hole input: stroke +/− counter, putt counter, GIR/FIR toggles |
| `frontend/src/components/live-round/LiveScoreHeader.tsx` | Sticky header: hole number, running total, to-par badge |
| `frontend/src/components/live-round/LiveRoundSummary.tsx` | Post-round summary screen before final save |
| `frontend/src/components/live-round/HoleProgressDots.tsx` | 18-dot progress strip showing scores already entered |
| `api/routers/live_rounds.py` | New router: `POST /api/live-rounds` (create), `PATCH /api/live-rounds/{id}/hole` (save one hole) |

### Modified Files

| File | Change |
|---|---|
| `frontend/src/App.tsx` | Add route `/live` → `<LiveRoundPage>` |
| `frontend/src/components/layout/Sidebar.tsx` | Add "Live Scoring" nav item (or prominent button on Dashboard) |
| `frontend/src/lib/api.ts` | Add `createLiveRound()`, `saveHoleScore()`, `finishLiveRound()` |
| `api/main.py` | Register `live_rounds` router |
| `frontend/src/pages/DashboardPage.tsx` | Add "Start Live Round" CTA card |

### API Design

```
POST /api/live-rounds
Body: { user_id, course_id?, tee_color?, course_name? }
Response: { round_id }
— Creates a round row with total_score=null, date=now.

PATCH /api/live-rounds/{round_id}/hole
Body: { hole_number, strokes, putts?, fairway_hit?, gir? }
Response: { running_total, running_to_par, holes_completed }
— Upserts the hole_score row for hole_number. Recalculates round total.

POST /api/live-rounds/{round_id}/finish
Response: { round_id }
— Marks round complete; final total_score persisted.
```

The backend can reuse `database/repositories/round_repo.py`'s existing `update_hole_scores`. The only new DB query is an upsert on `users.hole_scores` keyed on `(round_id, hole_number)`.

### DB Migration

No new tables required. All data fits the existing `users.rounds` + `users.hole_scores` schema. One additive column:

```sql
-- Migration 013: flag for live-tracked rounds
ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS entry_method VARCHAR(20) DEFAULT 'scan'
    CHECK (entry_method IN ('scan', 'manual', 'live'));
```

This lets analytics distinguish scanned vs live-entered rounds (useful for confidence, completeness metrics).

### State Machine (frontend)

```
idle
  → [tap "Start Live Round"]
course_select
  → [select course + tee]
hole_N  (N = 1..18)
  → [tap "Next Hole"]  →  hole_N+1
  → [tap "Done" on hole 18]  →  summary
summary
  → [tap "Save Round"]  →  redirect to /rounds/{id}
```

`useLiveRound` persists state to `sessionStorage` so a phone-lock or brief navigation doesn't lose the in-progress round. On mount it checks for an unfinished live round ID and offers to resume.

---

## Estimated Complexity

**Medium** — ~3–4 days of focused work.

- The data models, API patterns, and DB schema are all already in place.
- Most effort is in the mobile-first hole-scoring UI (HoleScoringCard + haptics, large tap targets) and the session-persistence / resume flow.
- No new auth flows, no new DB schemas, no LLM calls.

---

## Acceptance Criteria

- [ ] A golfer can start a live round from the Dashboard or nav, pick a course and tee, and enter scores for each of 18 holes without the app losing state if they lock their phone between holes.
- [ ] Each hole entry (strokes + optional putts/GIR/FIR) is persisted to the DB via `PATCH /api/live-rounds/{id}/hole` immediately after tapping "Next Hole", so a crash mid-round doesn't lose already-entered holes.
- [ ] The sticky header shows correct running total and to-par badge (color-coded: green under par, red over) after every hole entry.
- [ ] Finishing the round produces a saved Round indistinguishable from a scanned round in all downstream views (RoundDetailPage, analytics, handicap calculation).
- [ ] Rounds entered via live scoring are tagged `entry_method='live'` in the DB and the RoundDetailPage displays a "Live Entry" badge instead of a scan thumbnail.
