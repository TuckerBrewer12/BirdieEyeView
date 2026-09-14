# Daily Feature Plan: Live In-Round Hole-by-Hole Scoring

**Date:** 2026-09-14

---

## Feature Name
**Live In-Round Hole-by-Hole Scoring**

## One-Line Description
Let golfers track scores hole-by-hole in real time during a round — with auto-save and a running to-par display — turning the app from a post-round logging tool into an active on-course companion.

---

## User Value

Right now the only ways to log a round are:
1. **Scan** — photograph the paper scorecard after finishing (post-round only)
2. **Manual entry** — fill in all 18 holes at once on a single form (also post-round)

Neither works well *during* a round. A live tracker used on-course:
- Fits the natural mental model: golfers already pull out their phone between shots
- Creates daily opening habit — golfers open the app on hole 1, not just after they're done
- Shows a running score vs par so players always know where they stand
- Every tracked round enriches the existing handicap index and analytics engine
- Completes the app's loop: scan the paper card **or** just track it live from the start

The database already has `users.rounds.is_complete BOOLEAN DEFAULT FALSE` and `holes_played INTEGER` — both idle columns that this feature activates without any schema change.

---

## Technical Approach

### Database
No migration needed. Existing columns cover the requirement:
- `users.rounds.is_complete = FALSE` → round is in progress
- `users.rounds.is_complete = TRUE` → round is finished
- `users.rounds.holes_played` → updated on each hole save
- `users.hole_scores` → one row per hole, upserted as the player advances

### Backend — changed/new files

**`database/repositories/round_repo.py`**
- Add `upsert_hole_score(round_id, hole_number, hole_score_data)` — `INSERT ... ON CONFLICT (round_id, hole_number) DO UPDATE` so the player can back up and re-enter a hole.
- Add `get_in_progress_round(user_id)` — returns the most recent round where `is_complete = FALSE`.
- Add `finalize_round(round_id)` — sets `is_complete = TRUE`, computes and writes `total_score` and `holes_played`.

**`api/routers/rounds.py`**
- `PATCH /api/rounds/{id}/hole` — accepts a single `HoleScoreUpdate` body; calls `upsert_hole_score`; increments `holes_played`; returns `{ holes_played, score_so_far, to_par_so_far }`.
- `GET /api/rounds/in-progress` — returns the active in-progress round for the authenticated user (or 404 if none). Used on app load to restore an interrupted session.
- `POST /api/rounds/{id}/finalize` — calls `finalize_round`; returns the completed `Round`.

**`api/routers/scan.py`** (minor)
- The existing `POST /api/scan/save` already creates rounds — no change needed. New rounds created for live tracking go through `POST /api/rounds` directly.

### Frontend — new/changed files

**New: `src/pages/LiveRoundPage.tsx`**
- Route: `/rounds/live`
- On mount: calls `getInProgressRound` to resume a prior session, or uses a freshly started round
- Manages current hole index (1–18) in local state
- Renders `<LiveScoreHeader>` + `<HoleEntryCard>` for the current hole
- "Next Hole" → saves via `patchHoleScore`, advances index
- "Previous" → steps back (reads saved score for that hole from local state cache)
- "Finish Round" on hole 18 → calls finalize endpoint → navigates to `RoundDetailPage`

**New: `src/components/live-round/HoleEntryCard.tsx`**
- Large tap-target buttons for strokes (range 1–10), putts (0–5), fairway hit toggle, GIR toggle
- All controls sized for thumb use (min 48px tap target)
- Animated slide transition between holes using framer-motion spring (matches design system)
- Shows par for the hole (from linked course, or user-entered par)
- Color-coded result badge on hole completion (eagle/birdie/par/bogey/etc. using design system tokens)

**New: `src/components/live-round/LiveScoreHeader.tsx`**
- Sticky top bar: course name, "Hole X of 18", running total strokes, running to-par
- To-par badge uses existing score-type color tokens (green below par, red above, gray at par)
- "Abandon Round" overflow action — marks round deleted and returns to home

**New: `src/hooks/useLiveRound.ts`**
- Reads `localStorage['live_round_id']` on mount; resumes the round if still in-progress server-side
- Calls `PATCH /api/rounds/{id}/hole` after each hole; retries once on network error before surfacing an error toast
- Exposes: `{ round, currentHole, holeSoFar, advance, back, finalize, abandon }`

**`src/pages/ScanPage.tsx`** + **`src/components/scan/ScanUploadStep.tsx`**
- Add a third mode tile: **"Track Live"** (icon: `PlayCircle`, sub: "Score hole by hole", time: "On-course")
- Clicking it navigates to `/rounds/live?start=1` which starts a new round and jumps to hole 1
- If an in-progress round already exists, show a "Resume your round" banner instead and navigate to that round

**`src/lib/api.ts`**
- `startLiveRound(userId, { courseId?, teeBox?, date })` → `POST /api/rounds` returning new round with `is_complete=false`
- `patchHoleScore(roundId, holeScore)` → `PATCH /api/rounds/{id}/hole`
- `getInProgressRound(userId)` → `GET /api/rounds/in-progress`
- `finalizeRound(roundId)` → `POST /api/rounds/{id}/finalize`

**`src/App.tsx`**
- Add `<Route path="/rounds/live" element={<LiveRoundPage userId={userId} />} />`

---

## Estimated Complexity
**Large** — approximately 3–4 days of focused work

Breakdown:
- Backend endpoints + repo methods: ~0.5 day
- `useLiveRound` hook + API client additions: ~0.5 day
- `HoleEntryCard` + `LiveScoreHeader` components: ~1 day
- `LiveRoundPage` with resume logic + navigation: ~1 day
- Integration, edge cases (abandon, resume, back-navigation), testing: ~1 day

---

## Acceptance Criteria
- [ ] Golfer taps "Track Live" → optionally selects course → lands on hole 1 entry UI within 2 taps
- [ ] Entering strokes and tapping "Next Hole" saves the hole score server-side and advances to hole 2; running to-par updates immediately
- [ ] Closing and reopening the app (or navigating away) resumes the in-progress round at the correct hole via the stored `live_round_id`
- [ ] Running to-par score is color-coded after each hole using the existing score-type palette (green/gray/red/etc.)
- [ ] Tapping "Finish Round" on hole 18 marks the round complete, calculates total\_score, and navigates to `RoundDetailPage` — making the round visible in analytics and history immediately
