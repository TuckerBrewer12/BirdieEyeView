# Daily Feature Plan — 2026-09-08

## Feature: Live Scoring — Hole-by-Hole Score Entry During Play

**One-line description:** Let golfers enter scores on each hole in real time during their round, closing the gap between the scan-after-play flow and true on-course use.

---

## User Value

Right now the app only captures a round *after* it's over, via a photo scan of a paper scorecard. That works fine for casual users, but it has a ceiling: serious golfers want to track in real time on the course — see their running score-to-par, know their current handicap differential, and never need a paper card at all.

Live scoring turns this into a complete golf-round companion. It also provides a fallback when a photo scan fails (illegible card, bad lighting) and gives the app a reason to stay open on a phone in a cart holder all round. For a golfer with the Capacitor-built iOS app already installed, this becomes the primary way they use the product.

---

## Technical Approach

### New Frontend Page

**`frontend/src/pages/LiveScoringPage.tsx`**

- Route: `/live` (added to `App.tsx`)
- Step 1 — **Setup screen**: pick date, select course (search reuses `searchCourses` API call), choose tee color, enter player name(s). "Start Round" creates the round record server-side.
- Step 2 — **Hole entry screen**: shows current hole number, par, handicap stroke indicator, yardage. Large +/- spinner for stroke count, optional putts/fairway/GIR toggles. "Next →" saves the hole and advances. "← Prev" allows going back to fix an entry.
- Step 3 — **Running scorecard strip**: compact horizontal row at the bottom showing all 18 holes with color-coded scores (eagle/birdie/par/bogey+ using existing semantic colors). Score-to-par hero badge updates live.
- Step 4 — **Finish round**: after hole 18 (or any hole via "End Round Early"), show summary with total score, to-par, GIR%, putts, and a "View Full Round" button linking to `/rounds/:id`.

### New/Modified Backend Files

**`api/routers/rounds.py`** — add two endpoints:
- `POST /api/rounds/start` — creates a new `users.rounds` row in a pending/in-progress state with `is_complete = false`. Accepts `{ user_id, course_id?, tee_box?, course_name_played?, date }`. Returns the new `round_id`.
- `PATCH /api/rounds/{id}/holes/{hole_number}` — upserts a single `users.hole_scores` row for the given hole number. Accepts `{ strokes, putts?, fairway_hit?, green_in_regulation?, par_played?, handicap_played? }`. Recalculates `total_score` on the round row. Returns updated round totals.

**`database/repositories/round_repo.py`** — add `upsert_hole_score(round_id, hole_number, data)` that does an `INSERT … ON CONFLICT (round_id, hole_number) DO UPDATE`.

**`api/request_models.py`** — add `StartRoundRequest` and `LiveHoleScoreRequest` Pydantic models.

### Frontend API Client

**`frontend/src/lib/api.ts`** — add `startRound(payload)` and `patchHoleScore(roundId, holeNumber, data)`.

### No DB Migration Needed

The existing `users.rounds` and `users.hole_scores` tables already have all the columns needed (`is_complete`, `hole_number`, `par_played`, `handicap_played`, etc.). The only behavioral change is creating rounds with `is_complete = false` and progressively inserting hole_scores.

### Offline Resilience (Phase 2, not in this plan)

Each hole entry should also be persisted to `localStorage` keyed by `round_id` so that a lost network connection mid-round doesn't lose data. On reconnect, the app replays any unsynced holes. This is explicitly **out of scope for this first implementation** — call the API on each hole save and show a brief error toast if it fails.

---

## Estimated Complexity

**Medium**

- ~1 new full-page component (200-350 lines)
- ~2 new API endpoints + 1 new repo method
- ~2 new request models
- ~3 lines of routing change in `App.tsx`
- ~4 new API client functions
- No schema migration
- Reuses existing semantic colors, card styles, and round detail components

---

## Acceptance Criteria

- [ ] A golfer can navigate to `/live`, pick a course and tee, and tap "Start Round" to create a round record via the API (`is_complete = false`).
- [ ] On each hole, the golfer can enter stroke count (required) and optionally putts/fairway/GIR; tapping "Next" saves that hole's score to the DB and advances to the next hole.
- [ ] The running scorecard strip at the bottom updates after each hole save, showing color-coded score badges and a live score-to-par total.
- [ ] After hole 18 (or tapping "End Round Early"), the round is marked `is_complete = true` and the golfer is taken to `/rounds/:id` where the full round appears identically to a scan-saved round.
- [ ] The flow works end-to-end on mobile (375 px viewport) with tap targets ≥ 44 px and no horizontal scroll.
