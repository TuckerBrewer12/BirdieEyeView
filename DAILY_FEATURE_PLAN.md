# Daily Feature Plan — 2026-09-21

## Feature: Live Handicap Update on Round Save

**One-line description:** Compute, persist, and display the user's new WHS handicap index immediately after saving a scanned round, with an animated delta reveal on the post-save screen.

---

## User Value

Golfers are obsessed with their handicap index. Right now, the app does all the hard work — it scans the card, stores the scores, runs the math — but the moment the user taps "Save Round" they see only their gross score. They have to navigate away to the Dashboard or Analytics to find out if their handicap moved.

This feature closes that loop: the instant a round is saved, the app shows "Your new handicap: **14.8** (↓ from 15.2)". That single sentence is the most motivating feedback the app can deliver, and it costs almost nothing to compute because `analytics/handicap.py` already does the math — we just aren't persisting or surfacing it.

---

## What's Already Built (No Work Needed)

- `analytics/handicap.py` — full WHS differential math: `score_differential()`, `handicap_index()`, `score_differentials_per_round()`
- DB schema — `rounds.score_differential NUMERIC(4,1)`, `users.users.handicap_index`, `users.users.last_handicap_update` (all nullable, awaiting use)
- `api/routers/scan.py → save_round()` — round is already saved here; we just need a post-save hook
- `ScanSuccessStep.tsx` — the post-save UI component; just needs new props to display a handicap delta
- `api/schemas.py` — `RoundSummaryResponse` already has `handicap_index: Optional[float]`

---

## Technical Approach

### Backend (medium)

**`api/routers/scan.py` — `save_round()` (line ~790)**

After the round is saved:

1. Pull the user's last 20 rounds (in chronological order) from the DB, including the one just saved.
2. Snapshot `old_hi = user.handicap_index` before update.
3. Compute `new_hi = hcap.handicap_index(rounds_chrono)` from `analytics.handicap`.
4. Compute the differential for the just-saved round: `diff = hcap._get_differential_for_round(round_obj)`.
5. Persist in a single transaction:
   - `UPDATE users.rounds SET score_differential = $diff WHERE id = $round_id`
   - `UPDATE users.users SET handicap_index = $new_hi, last_handicap_update = NOW() WHERE id = $user_id`
6. Return the enriched response:

```python
class SaveRoundResponse(BaseModel):
    id: str
    total_score: int
    score_differential: Optional[float] = None
    old_handicap_index: Optional[float] = None
    new_handicap_index: Optional[float] = None
    handicap_changed: bool = False
```

**New files:**
- None required; add `SaveRoundResponse` to `api/schemas.py` or inline in `scan.py`.

**DB repositories to update:**
- `database/repositories/round_repo.py` — add `update_score_differential(round_id, diff)` method.
- `database/repositories/user_repo.py` — add `update_handicap_index(user_id, hi, timestamp)` method (likely already partially exists via `UpdateUserRequest`).

### Frontend (small–medium)

**`src/components/scan/ScanSuccessStep.tsx`**

Add an optional `handicapDelta` prop:

```tsx
interface HandicapDelta {
  oldHI: number | null;
  newHI: number | null;
  differential: number | null;
}

interface ScanSuccessStepProps {
  round: Round;
  onView: () => void;
  handicapDelta?: HandicapDelta | null;
}
```

If `handicapDelta` is present and `newHI != null`, render a new card between the score display and the CTA buttons:

```
┌─────────────────────────────────────┐
│  ⛳  Handicap Index                 │
│      15.2  →  14.8  ↓               │
│      Score differential: +1.8       │
└─────────────────────────────────────┘
```

- Animate the new HI value counting down/up using `framer-motion`.
- Green arrow (↓) when HI improved; red (↑) when it increased; gray (—) if unchanged or null.
- If `oldHI` is null (first-ever round with course rating data), show "Handicap established: **14.8**".

**`src/hooks/useScan.ts` (or `ScanPage.tsx`)**

Wire the save response into `ScanSuccessStep` via existing state. The save call already returns a JSON object; just extend the state type to carry `SaveRoundResponse` fields.

**`src/lib/api.ts`**

Update `saveRound()` return type to `SaveRoundResponse`.

**`src/types/scan.ts`**

Add `SaveRoundResponse` interface mirroring the backend model.

---

## Files to Change

| File | Change |
|---|---|
| `api/routers/scan.py` | Post-save: compute differential, update round + user in DB, return `SaveRoundResponse` |
| `api/schemas.py` | Add `SaveRoundResponse` Pydantic model |
| `database/repositories/round_repo.py` | Add `update_score_differential()` |
| `database/repositories/user_repo.py` | Add or reuse `update_handicap_index()` |
| `frontend/src/types/scan.ts` | Add `SaveRoundResponse` TypeScript interface |
| `frontend/src/lib/api.ts` | Update `saveRound()` return type |
| `frontend/src/components/scan/ScanSuccessStep.tsx` | Add `handicapDelta` prop + animated delta card |
| `frontend/src/pages/ScanPage.tsx` (or `useScan.ts`) | Pass delta from save response to `ScanSuccessStep` |

---

## DB Migration Needed?

**No.** `score_differential` and `handicap_index` columns already exist in the schema. We are simply starting to write to them.

---

## Estimated Complexity

**Medium** — roughly 1.5–2 days of focused work.

- Backend logic: ~2 hours (math is done, just wiring persistence + response)
- Repo methods: ~1 hour
- Frontend delta card: ~2–3 hours (animation, edge cases: no prior HI, no course rating, first round)
- Integration + tests: ~2 hours

---

## Acceptance Criteria

- [ ] After `POST /api/scan/save`, the `score_differential` column on the saved round row is populated (or `NULL` if no tee rating data is available).
- [ ] After save, `users.users.handicap_index` and `last_handicap_update` reflect the recalculated value.
- [ ] `POST /api/scan/save` response includes `old_handicap_index`, `new_handicap_index`, and `score_differential`.
- [ ] `ScanSuccessStep` displays the handicap delta card when a valid `newHI` is returned, with correct up/down color coding and a smooth count animation.
- [ ] When no course rating data is available (no `course_rating`/`slope_rating` on the tee), the differential falls back to score-to-par (existing `analytics/handicap.py` behavior), and the card still renders with a note indicating estimated data.
