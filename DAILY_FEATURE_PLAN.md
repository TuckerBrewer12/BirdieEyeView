# Daily Feature Plan — 2026-09-06

## Feature: Round Notes & Conditions Editor

**One-line description:** Let golfers add freeform notes and a weather/conditions tag to any round, visible in the round detail view and preserved across edits.

---

## User Value

A round's score alone tells only part of the story. Golfers think in context:
- "I shot 89 into 25 mph headwinds on a 7,200-yard setup"
- "New irons, first time at Pebble"
- "Played hurt — back acting up on back nine"

Right now there is no way to capture that context in the app. Notes and weather fields have been in the database schema and API since early development, but the frontend has never exposed them. Filling this gap makes every round in a player's history richer and more meaningful — especially when reviewing old rounds or sharing them socially.

---

## Technical Approach

This is a **frontend-only** change. The schema, API endpoint, and TypeScript types are all fully in place.

### What already exists (no changes needed)
- `users.rounds.notes TEXT` — validated, sanitized, stored (max 2,000 chars)
- `users.rounds.weather_conditions TEXT` — validated, stored (max 200 chars)
- `PUT /api/rounds/{id}` accepts `notes` and `weather_conditions`
- `api.updateRound()` in `frontend/src/lib/api.ts:97-98` already includes both in the request type
- `Round` type in `frontend/src/types/golf.ts:42-43` already has `weather_conditions: string | null` and `notes: string | null`

### Files to change

#### 1. `frontend/src/pages/RoundDetailPage.tsx`
- Add `editedNotes` (`string`) and `editedWeather` (`string`) state, initialized from `round.notes` and `round.weather_conditions` when edit mode opens
- In the edit-mode section (around line 508), render:
  - A weather chip/selector row: 6-8 preset tags (☀️ Sunny, 🌬️ Windy, 🌧️ Rain, ☁️ Overcast, 🥶 Cold, 🌡️ Hot, 🌫️ Foggy) that populate `editedWeather`, plus a short freeform input for custom conditions
  - A textarea for `editedNotes` with a 2,000-character soft limit shown as a counter
- In `handleSave`, pass `notes: editedNotes` and `weather_conditions: editedWeather` in the `updateRound` call (alongside the existing `hole_scores` / `tee_box`)
- In the view-mode render, show notes and weather below the scorecard when they are non-null:
  - Weather: inline pill with the stored string
  - Notes: indented blockquote-style text block with a subtle left border, using the existing card design system

#### 2. `frontend/src/components/round-detail/RoundDetailHeader.tsx` (optional)
- If weather is set, show a small weather pill in the header area alongside the date/course line, keeping the header compact

### New UI components (inline, no new files needed)
- `WeatherChipRow` — a row of pill buttons for preset weather tags; selecting one fills `editedWeather`; composable with the freeform input

### Design system alignment
- Preset chip buttons: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-white border border-gray-200 text-gray-600 hover:border-gray-300`; selected: `bg-primary text-white shadow-sm`
- Notes textarea: `rounded-xl border border-gray-200 text-sm text-gray-700 p-3 w-full resize-none focus:outline-none focus:ring-2 focus:ring-primary/30`
- Notes display (view mode): left border `border-l-2 border-primary/20 pl-3 text-sm text-gray-600 italic`

### No DB migration needed
The columns already exist. No backend changes required.

---

## Estimated Complexity

**Small** — frontend-only, ~100-150 lines of new JSX/TypeScript across 1-2 files, uses existing state patterns from the round detail page, no new API calls.

---

## Acceptance Criteria

- [ ] In edit mode on a round, a user can select a weather condition from preset chips OR type a custom condition (max 200 chars); the selection persists after saving
- [ ] In edit mode, a user can type freeform notes (max 2,000 chars) with a live character counter; notes persist after saving
- [ ] In view mode, if `weather_conditions` is set it appears as a readable pill below the round header; if `notes` is set it appears as a styled text block below the scorecard
- [ ] Saving a round with notes and weather updates the displayed values immediately (optimistic update via `queryClient.setQueryData`) without a page reload
- [ ] If notes and weather are both null/empty, no empty placeholder UI is shown in view mode (the section is hidden entirely)
