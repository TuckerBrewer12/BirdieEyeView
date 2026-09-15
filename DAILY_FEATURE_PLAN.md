# Daily Feature Plan — 2026-09-15

## Feature: Manual Round Entry

**One-line description:** Let users log a round hole-by-hole without scanning a scorecard photo.

---

## User Value

Right now a round can only enter the system through a successful LLM scan. That creates three painful failure modes:

1. The user played a round but doesn't have the physical card anymore.
2. The camera photo is blurry or the LLM extraction fails.
3. The user wants to backfill historical rounds from memory.

Manual entry removes all three blockers and makes the app useful to anyone who tracks scores, not just people who save every paper card. It also provides a natural fallback when scanning struggles, turning a dead-end error screen into a productive path.

---

## Technical Approach

### What already exists (no schema changes needed)

- `users.rounds` and `users.hole_scores` fully support manually-entered rounds — `hole_id` is nullable, `par_played` / `handicap_played` are stored on the score row, `course_id` is optional.
- `courses.py` search endpoint (`GET /api/courses/search`) lets the UI look up a course and pre-populate par values.
- The scan review UI (`ScanPage.tsx`) already has a hole-by-hole editing table — reuse that pattern.

### Backend changes

**File: `api/routers/rounds.py`**

Add `POST /api/rounds` endpoint:
```python
# Accepts: user_id, round_date, course_id (optional), tee_color (optional),
#          holes_played, total_score, notes, weather_conditions,
#          hole_scores: [{hole_number, strokes, par_played, putts,
#                         fairway_hit, gir, penalties}]
```
- Validates that `len(hole_scores)` is 9 or 18.
- Inserts into `users.rounds`, then bulk-inserts `users.hole_scores`.
- Returns the full round object (same shape as `GET /api/rounds/{id}`).
- Reuse `build_hole_scores()` from `services/scan_service.py` for the construction logic.

**File: `api/request_models.py`**

Add `ManualRoundRequest` Pydantic model (user_id, date, optional course fields, list of `ManualHoleScore`).

### Frontend changes

**New file: `frontend/src/pages/ManualEntryPage.tsx`**

A focused, multi-step form:

1. **Round Info step** — date picker (default today), course search (typeahead using `searchCourses()`), tee color selector (populated from course data), 9 vs 18 holes toggle.
2. **Scorecard step** — a compact table matching `ScorecardGrid`'s layout. Each row: Hole #, Par (pre-filled from course or editable), Strokes, Putts. GIR/FIR toggle row (optional, collapsible). "Quick fill" button: copy a stroke count to all remaining holes.
3. **Save step** — summary line ("Your round: 84 (+12)"), notes field, submit.

**File: `frontend/src/lib/api.ts`**

Add `createRound(payload: ManualRoundPayload): Promise<Round>` function.

**File: `frontend/src/App.tsx`**

Add route `/rounds/new` → `ManualEntryPage`.

**File: `frontend/src/pages/RoundsPage/index.tsx` (or equivalent)**

Add a "+ Log Round" button next to the existing scan CTA that routes to `/rounds/new`.

### No DB migrations needed

Schema already supports nullable `hole_id`, nullable `course_id`, and direct `par_played` storage on hole scores. Migration 002 already added these fields for exactly this purpose.

---

## Estimated Complexity

**Medium**

- Backend: ~60 lines across 2 files (new endpoint + request model).
- Frontend: ~250 lines for the multi-step form + api.ts addition.
- No schema changes, no new dependencies.
- Reuses existing course search, ScorecardGrid pattern, and scan_service helpers.

---

## Acceptance Criteria

- [ ] A user can navigate to `/rounds/new` and submit a complete 18-hole round with only strokes per hole, and the round appears immediately in their Rounds list.
- [ ] If the user selects a known course, par values are pre-populated from course data and the total-to-par line updates live as they enter scores.
- [ ] If no course is selected (anonymous round), the user can type par per hole manually and the round saves with `course_id = NULL` and `course_name_played` set from the free-text field.
- [ ] Putts, GIR, and fairway hit are optional — submitting with only strokes succeeds without validation errors.
- [ ] After save, the round detail page (`/rounds/{id}`) shows the manually-entered round with the same scorecard grid as a scanned round.
