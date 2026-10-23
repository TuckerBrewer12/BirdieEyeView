# Daily Feature Plan — 2026-10-23

## Feature: Friend Activity Feed

**One-line description:** Show a live feed of recent rounds played by accepted friends on the Social page.

---

## User Value

Golf is inherently social and competitive. Right now the app has full social infrastructure—friend codes, friendship requests, an inbox—but the Social page is a dead end: a friends list with names and nothing else. There's no way to see what a friend scored last weekend, which is the first thing any golfer wants to know.

A Friend Activity Feed closes that loop. A golfer opens the Social page and immediately sees "Alex shot 84 at Riviera CC yesterday" or "Sam had an eagle at hole 7." This is the primary retention mechanism for social products: seeing friends' activity pulls users back daily. It also makes the share-card feature (already built and wired up) more meaningful—there's now an in-app destination for that context.

---

## Technical Approach

### Backend

**New endpoint:** `GET /api/users/me/friends/activity?limit=20&offset=0`

- Location: `api/routers/users.py` — add to the existing users router
- Auth: Uses `current_user` dependency (already enforced on all `me/` routes)
- Logic:
  1. Fetch accepted friend IDs for `current_user.id` from `users.friendships` (both requester and addressee directions)
  2. Query `users.rounds` WHERE `user_id = ANY(friend_ids)` ORDER BY `round_date DESC, created_at DESC` LIMIT/OFFSET
  3. Join `users.users` to get display name + friend_code (for linking to friend profile later)
  4. Join `courses.courses` to get course name when `course_id IS NOT NULL` (fall back to `course_name_played`)
- Response model: `FriendActivityResponse` list (new Pydantic schema in `api/schemas.py`)

**New schema:** `FriendActivityItem` in `api/schemas.py`:
```python
class FriendActivityItem(BaseModel):
    round_id: UUID
    user_id: UUID
    display_name: str
    round_date: Optional[date]
    total_score: Optional[int]
    course_name: Optional[str]
    holes_played: Optional[int]
    is_complete: Optional[bool]
    tee_box_played: Optional[str]
```

**Files to change:**
- `api/routers/users.py` — add `GET /me/friends/activity` endpoint
- `api/schemas.py` — add `FriendActivityItem` schema

**DB migration:** None required. The query joins `users.friendships` + `users.rounds` + `users.users` + `courses.courses` using existing indexes (`idx_friendships_requester`, `idx_friendships_addressee`, `idx_rounds_user_date`).

### Frontend

**New API method** in `frontend/src/lib/api.ts`:
```ts
getFriendsActivity(limit?: number, offset?: number): Promise<FriendActivityItem[]>
```

**New type** in `frontend/src/types/golf.ts` (or a new `social.ts`):
```ts
export interface FriendActivityItem {
  round_id: string;
  user_id: string;
  display_name: string;
  round_date: string | null;
  total_score: number | null;
  course_name: string | null;
  holes_played: number | null;
  is_complete: boolean | null;
  tee_box_played: string | null;
}
```

**New component:** `frontend/src/components/social/FriendActivityFeed.tsx`
- Renders a `react-query`-powered list of activity cards
- Each card: friend's display name, course name, score + to-par pill (reuse score-type color logic), date (relative: "yesterday", "3 days ago")
- Empty state: "No recent activity from friends — check back after your friends play a round"
- Loading skeleton (3 placeholder cards)

**Update:** `frontend/src/pages/SocialPage.tsx`
- Import and mount `<FriendActivityFeed />` below the friends list
- Only render when `friends.length > 0`

**Files to change:**
- `frontend/src/lib/api.ts` — add `getFriendsActivity`
- `frontend/src/types/golf.ts` (or new `frontend/src/types/social.ts`) — add `FriendActivityItem`
- `frontend/src/components/social/FriendActivityFeed.tsx` — new file
- `frontend/src/pages/SocialPage.tsx` — mount feed below friends list

---

## Estimated Complexity

**Medium**

- Backend: ~60 lines (1 new endpoint, 1 new schema, 1 DB query with 3 joins)
- Frontend: ~120 lines (1 new component, 1 type, 2 small edits)
- No DB migration, no new tables, no new dependencies
- Privacy: enforced by the friendship check in the query — only accepted friend rounds are returned

---

## Acceptance Criteria

- **AC1:** `GET /api/users/me/friends/activity` returns rounds from accepted friends only, sorted by most recent first, with correct `total_score`, `course_name`, and `round_date`.
- **AC2:** The Social page shows a feed section with a card for each recent friend round; each card displays the friend's name, course, score, and a relative date ("today", "yesterday", "3 days ago").
- **AC3:** Users with no friends, or friends who haven't played any rounds, see a friendly empty-state message instead of a blank section.
- **AC4:** The endpoint returns HTTP 401 if called without authentication and HTTP 403 if a user attempts to query another user's friends' activity.
- **AC5:** A friend's round does not appear in the feed until they save it; once saved it appears within one page refresh (no caching beyond the React Query default staleTime).
