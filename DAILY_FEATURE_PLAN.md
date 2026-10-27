# Daily Feature Plan — 2026-10-27

## Feature: Round Notes & Weather Conditions Editor

**One-line description:** Surface the already-existing `notes` and `weather_conditions` fields in the round detail UI, letting golfers annotate rounds with context that numbers alone can't capture.

---

## User Value

Every golfer has a story behind their scorecard — "blustery morning at Torrey Pines", "first round with my son", "tournament nerves on the back nine." Right now there's nowhere to record it. The notes field is fully modelled in the DB and API but is invisible in the UI; every round is saved with `notes: null`. Adding inline editing in the round detail view unlocks a lightweight golf journal without any architectural work.

Weather conditions are especially valuable because they contextualise the score for the handicap story: a 78 in 30 mph winds is not the same as a 78 on a calm day. This context also enriches future sharing — the ShareCard image already renders but carries no conditions copy.

---

## Technical Approach

### What already exists (no changes needed)

| Layer | Status |
|---|---|
| `users.rounds.notes TEXT` column | ✅ in schema + all migrations |
| `users.rounds.weather_conditions VARCHAR(255)` column | ✅ in schema |
| `PUT /api/rounds/{id}` — accepts `notes`, `weather_conditions` | ✅ validated + sanitised in `api/routers/rounds.py:57–69, 221–224` |
| TypeScript `Round.notes`, `Round.weather_conditions` types | ✅ `frontend/src/types/golf.ts:42–43` |
| `api.updateRound({ notes, weather_conditions })` client method | ✅ `frontend/src/lib/api.ts:77–78` |

### Files to change

**1. `frontend/src/components/round-detail/RoundNotesPanel.tsx` (new file)**

A self-contained component that:
- Renders `round.notes` as a read-only blockquote when present, or a soft "Add notes…" prompt when null.
- Renders `round.weather_conditions` as a small pill row (sun ☀️ / cloud ☁️ / rain 🌧️ / wind 💨 / cold 🥶 — single-select quick-pick + free-text fallback).
- Transitions to an edit mode on click, with a `<textarea>` (max 2 000 chars) and a weather chip row.
- On save fires `api.updateRound(id, { notes, weather_conditions })` and updates the React Query cache via `queryClient.setQueryData`.
- On escape/outside-click discards unsaved edits.
- Follows the existing card design system: `bg-white rounded-2xl border border-gray-100 shadow-sm p-5`.

**2. `frontend/src/pages/RoundDetailPage.tsx`**

- Import `RoundNotesPanel` and insert it between `RoundStory`/`RoundNarrative` and the scorecard grid. One import + one JSX element.

**3. `frontend/src/components/scan/ScanReviewStep.tsx` (optional stretch)**

- Add a collapsible "Add notes" section in the review step so users can annotate before saving. Pass `notes` / `weather_conditions` to `useScan.handleSave`.

**4. `frontend/src/hooks/useScan.ts` (if stretch goal included)**

- Forward `notes` and `weather_conditions` from `ScanState` through to `api.saveRound` payload.

### No DB migration needed

The columns exist in `schema.sql` and all applied migrations. No backend changes are needed.

---

## Estimated Complexity

**Small** — approximately 2–4 hours of frontend work. No schema changes, no new API endpoints, no new backend logic. Single new component + one import in an existing page.

---

## Acceptance Criteria

- [ ] Opening any round detail shows a notes section below the round narrative. If `notes` is non-null it renders the text; if null it shows a subdued "Add a note…" prompt.
- [ ] Clicking the notes section (or its edit button) opens inline editing with a textarea and a weather chip row (☀️ Sunny / ⛅ Partly Cloudy / 🌧️ Rainy / 💨 Windy / 🥶 Cold / 🌤️ Clear).
- [ ] Saving persists both fields via `PUT /api/rounds/{id}` and the detail page reflects the update without a full reload.
- [ ] Cancelling or pressing Escape discards unsaved edits.
- [ ] The ShareCard image gains a conditions line when `weather_conditions` is set (e.g. "☀️ Sunny · White Tees" in the footer area).

---

## Discovery Notes

Codebase explored on 2026-10-27. Recent commits (last 20) show the team focused on scan reliability (failed-scan reports, preprocessing evals, parser fixes) and test infrastructure. Social/friends, analytics, goals, handicap trend, and the share card are all shipped. The most glaring UI gap found was this notes/conditions field: fully wired at every layer except the view.

Secondary candidates considered and ruled out:
- **9-hole round support** — the handicap module already guards for it; a fuller implementation would touch more layers.
- **Friend activity feed** — high value but large scope (new DB tables, privacy model, notifications).
- **Handicap differential badge on round list** — already calculated in `analytics/handicap.py`; surfacing it is smaller than this feature and less user-visible.
