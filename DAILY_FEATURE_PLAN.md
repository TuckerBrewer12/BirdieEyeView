# Daily Feature Plan — 2026-10-06

## Feature: Friend Profile Pages

**One-line description:** Let users tap a friend's name to see their profile — handicap index, recent rounds, and stats — completing the social loop.

---

## User Value

The social system (friend codes, friend requests, inbox) was fully built but currently dead-ends at a static name+email list. There is nothing a golfer can *do* with their friends yet. Friend Profile Pages close this loop: seeing a friend's handicap trend and score breakdown is a core reason people share their golf data, and it creates a natural motivation to scan more rounds. The backend already supports friend-gated stats access (`are_friends` check in `api/routers/stats.py`) — the feature is ~70% backend-complete.

---

## Technical Approach

### New Page
- **`frontend/src/pages/FriendProfilePage.tsx`** — receives `friendUserId` from URL param, fetches stats using the existing `/api/stats/{user_id}` endpoint (already friend-gated), and renders:
  - Header: name, handicap index pill, rounds-played count
  - Recent Rounds list (last 10): date, course name, score, to-par
  - Two summary stat cards: scoring distribution donut + average score trend sparkline (reuse existing chart components from `AnalyticsPage`)

### Changes to Existing Files
- **`frontend/src/pages/SocialPage.tsx`** — wrap each friend row in a `<Link to={/friends/${f.id}}>` so names are tappable
- **`frontend/src/App.tsx`** — add route `/friends/:friendId` → `<FriendProfilePage>`
- **`frontend/src/lib/api.ts`** — add `getFriendStats(userId: string, limit?: number)` calling `/api/stats/{userId}` (reuses existing shape)

### New API Endpoint (minimal)
- **`api/routers/users.py`** — add `GET /api/users/{id}/public-profile` returning `{ name, handicap_index, rounds_count }` for a friend (no extra DB query needed — just filter the existing user row + run `hcap.handicap_index` on their rounds)
  - Alternatively, reuse `GET /api/stats/{user_id}` directly from the frontend (already friend-gated); no new endpoint strictly required

### No DB Migrations Required
All required data (rounds, hole scores, handicap index calculation) is already available.

---

## Estimated Complexity

**Medium** — mostly frontend (1 new page, 2 small edits). The backend is already friend-gated. The new page reuses existing chart/stat components so it's primarily wiring and layout, not net-new logic.

Rough estimate: 4–6 hours of focused work.

---

## Acceptance Criteria

- [ ] Tapping a friend's name in the Social page navigates to their profile (`/friends/:id`)
- [ ] Profile shows the friend's name, calculated handicap index, and total rounds played
- [ ] Profile shows a list of the friend's 10 most recent rounds (date, course, score, to-par) — fetching fails gracefully if not friends
- [ ] A non-friend cannot access the profile page (API returns 403; frontend shows "Not friends" message)
- [ ] Back button returns to Social page; page renders correctly on mobile (single-column)
