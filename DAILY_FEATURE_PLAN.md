# Daily Feature Plan — 2026-10-25

## Feature: Friend Activity Feed

**One-line description:** A social feed showing friends' recent rounds with score, course, and key stats so golfers can follow each other's games without needing extra apps.

---

## User Value

Golfers already share scores with friends verbally or via text. Right now ScanScorecards has a working friends system (friend codes, accept/decline requests, friend list) but **nothing actually happens** once you're connected — there's no way to see what your friends are playing.

A feed fixes this. After accepting a friend, you see their recent rounds inline: course name, gross score, handicap differential, and a few highlights (birdies, score type breakdown). It creates a reason to open the app every day, not just when scanning a new card. It also makes the scanning habit feel social and visible — which is proven to improve retention in fitness and sports apps.

---

## Technical Approach

### Backend

**New endpoint:** `GET /api/users/me/feed`
- Auth: JWT-protected, returns feed for the current user only
- Query params: `limit` (default 20, max 50), `offset` (pagination)
- Logic: fetch accepted friend IDs → query `users.rounds` WHERE `user_id IN (friend_ids)` AND `is_complete = TRUE` ORDER BY `round_date DESC`
- Response shape (new `FeedItem` Pydantic schema):
  ```json
  {
    "round_id": "uuid",
    "user_id": "uuid",
    "display_name": "string",
    "course_name": "string | null",
    "round_date": "date",
    "total_score": "int | null",
    "score_differential": "float | null",
    "holes_played": "int",
    "score_type_summary": {"birdies": 2, "pars": 10, "bogeys": 5, ...}
  }
  ```
- Privacy: only complete rounds (`is_complete = TRUE`) are shown; partial/draft rounds are hidden

**Files to change:**
- `api/routers/users.py` — add `GET /me/feed` route (≈40 lines)
- `api/schemas.py` — add `FeedItem` and `FeedResponse` Pydantic models
- `database/repositories/round_repo.py` — add `get_friend_rounds(user_ids, limit, offset)` query
- `database/db_manager.py` — expose `get_friend_rounds` on the facade

**No DB migration needed** — all required data is already in `users.rounds` and `users.hole_scores`.

### Frontend

**New page:** `FeedPage.tsx` at `frontend/src/pages/FeedPage.tsx`
- Route: `/feed` (add to `App.tsx`)
- Uses `useQuery` via `api.getFeed()` in `src/lib/api.ts`
- Shows infinite-scroll list of `FeedCard` components (one per round)

**New component:** `FeedCard.tsx` at `frontend/src/components/feed/FeedCard.tsx`
- Displays: friend's name/avatar initial, course name, date, gross score, +/- to par, score type pill row (color-coded using existing palette from CLAUDE.md)
- Tapping the card navigates to `/rounds/:id` (existing RoundDetailPage) — no new page needed for detail
- Empty state: "No rounds yet. Add friends to see their games here." with link to `/social`

**Files to add:**
- `frontend/src/pages/FeedPage.tsx`
- `frontend/src/components/feed/FeedCard.tsx`

**Files to change:**
- `frontend/src/App.tsx` — add `/feed` route
- `frontend/src/lib/api.ts` — add `getFeed(limit?, offset?)` client method
- `frontend/src/components/layout/Sidebar.tsx` (or nav component) — add Feed link with activity dot indicator

**Nav badge (optional stretch):** Store the most-recent feed item date in `localStorage`; if new rounds exist since last visit, show an unread dot on the Feed nav item.

---

## Estimated Complexity

**Medium**

- Backend: ~100 lines across 4 files; no schema changes; straightforward SQL join
- Frontend: ~150 lines for FeedPage + FeedCard; reuses existing design system components and score-type color palette
- Total estimated time: 4–6 hours for a polished MVP

---

## Acceptance Criteria

- [ ] `GET /api/users/me/feed` returns up to 20 completed rounds from accepted friends, ordered newest-first, with correct `score_type_summary` counts
- [ ] Feed page renders in the app with working pagination (load more on scroll or button)
- [ ] Each feed card shows: friend name, course name (or "Unknown Course"), date, gross score, and a color-coded score type pill row matching the existing design system palette
- [ ] Tapping a card opens the existing Round Detail page for that round (read-only for non-owners)
- [ ] Empty state shown when user has no friends or friends have no complete rounds
- [ ] Route is authenticated — unauthenticated users are redirected to `/login`
