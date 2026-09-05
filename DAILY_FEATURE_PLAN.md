# Daily Feature Plan — 2026-09-05

## Feature: Friend Activity Feed

**One-line description:** Show friends' recent rounds on the Social page so the friends system has actual payoff.

---

## User Value

Golfers are inherently competitive and social. The friendship infrastructure is fully built — users can add friends by code, accept/decline requests — but once a connection is accepted, nothing happens. The Social page shows a list of names with no activity. There is zero reason to add friends today.

A feed of friends' recent rounds closes that loop: you can instantly see where your buddies played, what they shot, and how it compares to your own rounds at the same course. This is the social hook that makes golfers want to invite others to the app and return to it daily.

---

## Technical Approach

No DB migration required. All needed data exists: `users.rounds`, `courses.courses`, `users.friendships`, `users.users`.

### 1. New DB query — `database/repositories/round_repo.py`

Add `get_friend_rounds(user_id: str, limit: int = 20) -> list[dict]`:

```sql
SELECT
    r.id, r.round_date, r.total_score, r.course_name_played,
    r.tee_box,
    c.name AS course_name, c.location AS course_location,
    u.id AS friend_id, u.name AS friend_name
FROM users.friendships f
JOIN users.users u
    ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
JOIN users.rounds r ON r.user_id = u.id
LEFT JOIN courses.courses c ON c.id = r.course_id
WHERE (f.requester_id = $1 OR f.addressee_id = $1)
  AND f.status = 'accepted'
  AND r.total_score IS NOT NULL
ORDER BY r.round_date DESC NULLS LAST, r.created_at DESC
LIMIT $2
```

### 2. Expose via DatabaseManager — `database/db_manager.py`

Add pass-through method `get_friend_rounds(user_id, limit)`.

### 3. New API endpoint — `api/routers/social.py` (new file)

```
GET /api/social/feed?limit=20
```

- Authenticated (requires `get_current_user` dependency)
- Returns list of `FriendRoundEntry` objects:
  ```json
  {
    "round_id": "...",
    "friend_id": "...",
    "friend_name": "Tucker",
    "course_name": "Torrey Pines",
    "course_location": "La Jolla, CA",
    "round_date": "2026-09-03",
    "total_score": 84,
    "tee_box": "white"
  }
  ```

Register in `api/main.py` with prefix `/api/social`.

### 4. Frontend type — `frontend/src/types/golf.ts`

Add `FriendRoundEntry` interface matching the response shape.

### 5. API client — `frontend/src/lib/api.ts`

Add:
```ts
getFriendFeed(limit = 20): Promise<FriendRoundEntry[]>
```

### 6. Social page UI — `frontend/src/pages/SocialPage.tsx`

Below the existing friends list, add a "Recent Activity" section:
- `useQuery` with key `["friend-feed"]`
- Each entry: avatar initial circle (friend name), course + location, score badge (color-coded by type), relative date ("2 days ago")
- Empty state: "Add friends to see their rounds here."
- Loading skeleton: 3 gray placeholder rows

Design follows existing card system: `bg-white rounded-2xl border border-gray-100 shadow-sm`, `divide-y divide-gray-50` list.

---

## Estimated Complexity

**Medium** — ~4–5 hours of focused work. No schema changes; straightforward join query + new endpoint + UI section.

---

## Acceptance Criteria

- [ ] `GET /api/social/feed` returns the authenticated user's accepted friends' most recent rounds, ordered newest first, with correct course name (falls back to `course_name_played` when no `course_id`)
- [ ] The Social page displays a "Recent Activity" feed section below the friends list, showing friend name, course, score, and date for each entry
- [ ] Rounds with `total_score IS NULL` (incomplete scans) are excluded from the feed
- [ ] A user with no accepted friends sees a friendly empty-state prompt ("Add friends to see their rounds here")
- [ ] The feed respects the existing auth middleware — unauthenticated requests return 401
