# Daily Feature Plan — 2026-09-09

## Feature: WHS Handicap History Tracker

**One-line description:** Surface the existing per-round differential and rolling handicap-index computations through a new API endpoint and a dedicated UI panel so golfers can see exactly which rounds count toward their handicap and how their index has moved over time.

---

## User Value

Handicap index is the single number every golfer obsesses over. The app already computes a full WHS-compliant index, but only exposes the final number. Golfers want to know:

- Which of their last 20 rounds are the "counting" best-N differentials?
- Did today's round lower or raise my index?
- How has my index trended over the season?

Showing this turns the handicap from a black box into an understandable, actionable metric — the kind of transparency competing apps rarely offer.

---

## What Already Exists (Backend)

All WHS computation is done in `analytics/handicap.py` but **none of it is exposed via any API endpoint**:

| Function | What it returns |
|---|---|
| `score_differentials_per_round(rounds)` | Per-round: score, course/slope rating, differential |
| `handicap_trend(rounds, ...)` | Rolling HI after each round |
| `annotate_used_in_hi(entries)` | Marks exactly which rounds count + the threshold value |

The only existing handicap endpoint is `GET /api/users/{user_id}/handicap` → `{"handicap_index": 12.3}`.

---

## Technical Approach

### 1. New API endpoint — `api/routers/stats.py`

Add `GET /api/stats/{user_id}/handicap-history`:

```python
@router.get("/{user_id}/handicap-history")
async def get_handicap_history(user_id: str, db: DatabaseManager = Depends(get_db)):
    rounds = await db.rounds.get_rounds_for_user(user_id)   # already exists
    user   = await db.users.get_user(user_id)               # already exists

    # Build trend entries (oldest → newest)
    entries = hcap.handicap_trend(
        rounds,
        seed_handicap=user.handicap,
        seed_set_at=user.last_handicap_update,
    )
    hcap.annotate_used_in_hi(entries)

    # Per-round differentials (parallel list)
    diffs = hcap.score_differentials_per_round(rounds)

    return {
        "current_index": hcap.handicap_index(rounds, seed_handicap=user.handicap, seed_set_at=user.last_handicap_update),
        "rounds_needed": max(0, 3 - sum(1 for e in entries if e["differential"] is not None)),
        "trend": entries,        # [{round_id, handicap_index, differential, used_in_hi, hi_threshold}]
        "differentials": diffs,  # [{round_id, score, course_rating, slope_rating, differential}]
    }
```

No new DB queries needed — both repo methods already exist.

**Files to change:**
- `api/routers/stats.py` — add the new route
- `api/request_models.py` — add `HandicapHistoryResponse` Pydantic model (optional but clean)

### 2. API client — `frontend/src/lib/api.ts`

Add:
```ts
getHandicapHistory: (userId: string) =>
  fetch(`/api/stats/${userId}/handicap-history`).then(r => r.json()),
```

### 3. Analytics types — `frontend/src/types/analytics.ts`

Add `HandicapEntry`, `DifferentialEntry`, `HandicapHistory` types.

### 4. New UI section — new file `frontend/src/components/analytics/HandicapTrackerPanel.tsx`

A card (follows the existing `bg-white rounded-2xl border border-gray-100 shadow-sm` system) showing:

- **Hero stat:** Current index large, with a +/- delta vs. 30 days ago
- **Rolling trend chart:** SVG line chart (reuse `SVGHandicapTrend` or build alongside it) plotting handicap index per round — same style as other SVG charts in the analytics section
- **Differentials table / pill row:** Last 20 rounds, each showing differential value. Rounds currently counting toward the index are highlighted green (use `#059669`); others are muted gray. The threshold value is shown as a dashed line in the chart.
- **"Rounds needed" callout:** If fewer than 20 rounds exist, a small chip showing e.g. "5 more rounds for a full index"

**Framer-motion entrance:** standard `ScrollSection` wrapper (already used across analytics).

### 5. Wire into AnalyticsPage

Add `HandicapTrackerPanel` to `frontend/src/pages/AnalyticsPage.tsx` as a new section — place it in the scoring section (just below the handicap trend KPI card that already exists there).

Also add `getHandicapHistory` to the analytics query in `frontend/src/hooks/useAnalyticsViewModel.ts` (or equivalent analytics hook).

---

## No DB Migrations Needed

All required data (`score_differential`, `adjusted_gross_score`, `slope_rating`, `course_rating`, `last_handicap_update`) exists in the current schema. Migration 012 is the latest applied.

---

## Estimated Complexity

**Medium** — roughly 1–2 days.

- Backend endpoint: ~40 lines, all computation already done
- TypeScript types: ~20 lines
- UI component: ~150–200 lines (SVG chart + table)
- Integration into analytics page: ~20 lines

The risk is styling the differentials table to feel native to the existing analytics design system, but the patterns (pill rows, SVG charts, color semantics) are all already established.

---

## Acceptance Criteria

1. `GET /api/stats/{user_id}/handicap-history` returns `current_index`, `trend` (one entry per round with `used_in_hi` boolean), and `differentials` with valid WHS values; returns a clear response when fewer than 3 rounds exist.
2. The `HandicapTrackerPanel` renders on the Analytics page and correctly marks the counting rounds (highlighted) vs. non-counting rounds (muted) in the differentials display.
3. The rolling-index chart draws correctly for users with 3–20+ rounds; includes a "not enough rounds yet" empty state for users with fewer than 3.
4. The panel respects the existing dark-mode token system (`data-theme="dark"`) and color-blind palette overrides from `src/lib/accessibility.ts`.
5. The endpoint is covered by a backend unit test (parallel to existing tests in `tests/`) verifying the `used_in_hi` annotation matches manual WHS counting for a known fixture dataset.
