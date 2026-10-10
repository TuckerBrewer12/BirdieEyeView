# Daily Feature Plan — 2026-10-10

## Feature: Quick Manual Round Entry

**One-line description:** A wizard-style, hole-by-hole manual score entry flow that lets golfers log a round without scanning a paper scorecard.

---

## User Value

Right now, the only way to record a round is to photograph a paper scorecard and run it through the Gemini OCR pipeline. This creates two major failure modes:

1. **Scan failures** — LLM extraction can mis-read scores (recent commits show ongoing work on scan preprocessing, parser fixes, and a "report failed scan" button), leaving users unable to save their round.
2. **No paper card** — Many golfers keep score on their phone and never have a physical scorecard. The app is invisible to this audience entirely.

A manual entry flow makes the app useful to *every* golfer, not just those with paper scorecards. It also provides an immediate fallback when scan quality is poor, turning a dead-end into a smooth two-tap escape hatch.

**Why this over alternatives:**
- A `ShareCard` component already exists (shareable round card feature) but requires social proof/existing rounds first.
- The social/friends layer is stub-level, but social features are only valuable once users can reliably log rounds.
- Manual entry is the *enabler* for both of those features.

---

## Technical Approach

### Backend (minimal changes needed)

The data model and APIs are already complete. The only new endpoint needed is a round *creation* step distinct from the scan save flow.

**New endpoint:**
- `POST /api/rounds/create-manual` — creates a round shell (no scan attached) with `course_id`, `tee_color`, `played_at`, and initial 18 `hole_scores` records (strokes only; putts/fairway/GIR optional). Returns `round_id`.

**Files to touch:**
- `api/routers/rounds.py` — add `create_manual` endpoint
- `database/repositories/round_repo.py` — add `create_round_with_scores()` helper (reuse existing `save_round` logic, skip `scorecard_scans` insert)
- `api/request_models.py` — add `ManualRoundRequest` Pydantic model

No DB migrations needed — the existing `rounds` and `hole_scores` tables fully support manually-entered rounds (both already tolerate `hole_id IS NULL` and `course_id IS NULL`).

### Frontend (primary effort)

**New page/component tree:**
```
src/pages/ManualEntryPage.tsx          ← wizard shell (multi-step state machine)
src/components/manual-entry/
  CourseSelectStep.tsx                 ← step 1: pick existing course or "no course"
  TeeSelectStep.tsx                    ← step 2: pick tee color + date
  HoleEntryStep.tsx                    ← step 3: swipeable hole-by-hole score cells
  ReviewStep.tsx                       ← step 4: scorecard summary before submit
  ManualEntryProgressBar.tsx           ← step indicator (reuse scan wizard style)
```

**Routing:**
- Add `/rounds/new` route in `src/App.tsx`
- Add "Log a Round" button on `DashboardPage` (the existing "scan" CTA card gets a second action) and a `+` FAB on `RoundsPage`

**HoleEntryStep UX** (the core interaction):
- One hole displayed at a time with swipe left/right navigation (Framer Motion drag gesture)
- Large tap targets: `–` / `+` buttons for strokes (range 1–15)
- Optional secondary row for putts (toggle on/off)
- Running score total (to par) in header updates live
- Skip to any hole via a mini dot-nav strip at bottom

**API integration:**
- `src/lib/api.ts` — add `createManualRound(payload)` calling new endpoint
- On submit: `POST /api/rounds/create-manual` → navigate to `RoundDetailPage` for the new round

**Reuse existing components:**
- `ScorecardGrid` — final review step and round detail (no changes)
- `CourseSearchBar` (if exists) or the course search used in `CoursesPage` — reuse for course selection step
- Scan wizard's `ManualSetup` styles/patterns as visual reference

---

## Estimated Complexity

**Medium** — approximately 3–4 days of focused work.

- Backend: ~1 day (1 endpoint + repo helper + request model)
- Frontend wizard shell + routing: ~0.5 day
- CourseSelectStep + TeeSelectStep: ~0.5 day
- HoleEntryStep (swipe UX, score incrementer): ~1 day (most novel UI work)
- ReviewStep + wiring: ~0.5 day
- Polish + mobile testing: ~0.5 day

---

## Acceptance Criteria

- [ ] A "Log a Round" entry point is visible on the Dashboard and Rounds pages; tapping it starts the wizard without touching the scan flow.
- [ ] Users can select an existing course (or proceed without one), pick a tee color, and enter a played date before reaching hole entry.
- [ ] Hole entry allows inputting strokes for all 18 holes (or 9 for a partial round) with a live running total-to-par shown in the header; putts are optional per hole.
- [ ] Submitting the form creates a round in the database and redirects to `RoundDetailPage` showing the entered scorecard with full stats (total score, to-par, score type distribution).
- [ ] The manual-entry round appears in the Rounds list, Analytics, and Career stats exactly as a scan-sourced round does — no special-casing in stat calculations.
