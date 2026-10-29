# Daily Feature Plan — 2026-10-29

## Feature: Live In-Round Scorecard (Hole-by-Hole Mobile Entry)

**One-line description:** A mobile-first, hole-by-hole score entry flow that lets golfers track their round live on the course without needing a physical scorecard.

---

## User Value

Right now, the **only** way to log a round is to scan a paper scorecard after you finish. That means:
- Golfers who lose or forget their scorecard lose the round entirely.
- Casual rounds on unfamiliar courses go untracked.
- There is zero in-round engagement — the app is invisible during the most exciting 4 hours of a golfer's day.

**Live scoring transforms the app from a post-round logger into a round companion.** Golfers open it on the 1st tee, tap scores after each hole, and get a running to-par counter for the whole round. At the end they hit "Save" — same flow as a scan. Daily active usage increases dramatically because the most natural moment to touch the app (on the course) is no longer locked out.

---

## Technical Approach

### New Files

| File | Purpose |
|---|---|
| `frontend/src/pages/LiveRoundPage.tsx` | Top-level route for the live round flow |
| `frontend/src/hooks/useLiveRound.ts` | State machine: hole navigation, score entry, save |
| `frontend/src/components/live-round/HoleEntryCard.tsx` | Per-hole entry UI: +/− tapper for strokes, putts, GIR/FIR toggles |
| `frontend/src/components/live-round/RunningScoreHeader.tsx` | Sticky header: current hole, total score, to-par |
| `frontend/src/components/live-round/LiveRoundSetup.tsx` | Pre-round setup: course picker, tee, date (reuses `ScanManualSetup` logic) |
| `frontend/src/components/live-round/LiveRoundSummary.tsx` | Post-round review before saving (mirrors `ScanReviewStep` layout) |

### Modified Files

| File | Change |
|---|---|
| `frontend/src/App.tsx` | Add `/live-round` route |
| `frontend/src/pages/ScanPage.tsx` (or `ScanUploadStep.tsx`) | Add "Enter Scores Manually" CTA that navigates to `/live-round` |
| `frontend/src/lib/api.ts` | No new endpoints needed — `saveRound` already handles this payload |

### No DB Migration Required

The live round payload is identical to a scanned round save: a list of `{ hole_number, strokes, putts, fairway, gir, par_played }` objects. `POST /api/scan/save` already accepts `course_holes` for par lookup. Live entry is purely a frontend addition.

### UX Flow

```
/scan → "Enter Scores Manually" button
    → /live-round (LiveRoundSetup)
        [pick course (optional), tee, date → Start Round]
    → HoleEntryCard (hole 1 of 18)
        [+/− tapper for strokes, putts toggle, GIR/FIR toggles]
        [Next →]
    → HoleEntryCard (hole 2..18)
        [running to-par in sticky header]
    → LiveRoundSummary (editable scorecard review)
        [Save Round → POST /api/scan/save]
    → /rounds/:id (existing success flow)
```

### Key UX Details

- **Giant +/− tappers** for strokes (thumb-friendly on phone mid-round).
- **Swipe gestures** (left = next hole, right = previous) for fast navigation.
- **Auto-advance** after stroke entry; putts/GIR/FIR are optional secondary taps.
- **Persist to `localStorage`** after every hole so a crash or app-close doesn't lose the round.
- **Running total header** pinned at top: `Hole 7 | +4 | 43`.
- Course and tee are optional — anonymous rounds without a linked course are already supported by the backend (`course_name_played` fallback, nullable `hole_id`).

### Reused Infrastructure

- `ScanManualSetup` component → course/tee picker reused in `LiveRoundSetup`
- `ScanReviewStep` layout → `LiveRoundSummary` mirrors it
- `POST /api/scan/save` endpoint → unchanged
- `useShareRound` → share after save as today

---

## Estimated Complexity

**Medium** — ~3–4 days of focused frontend work. No backend changes. Most logic is new UI state (hole navigation, +/− entry), not new data structures.

---

## Acceptance Criteria

- [ ] A golfer can start a live round from the Scan page (or a dashboard CTA) without uploading an image.
- [ ] Hole-entry card shows current hole number, par (if course known), and large +/− buttons for strokes; putts and GIR/FIR toggles are secondary.
- [ ] A sticky header shows the running total score and to-par across all entered holes.
- [ ] In-progress round survives a page refresh (persisted to `localStorage`).
- [ ] Completing all 18 holes (or tapping "Finish Early") shows a review screen where any hole can be edited before saving.
- [ ] Saved live round appears in the Rounds list with the same data quality as a scanned round (par, course name if provided, full hole-score breakdown).
