# Daily Feature Plan — 2026-10-01

## Feature: Friends Activity Feed

**One-line description:** Show a live feed of accepted friends' recent rounds on the Social page, completing the social loop the friendship system already sets up.

---

## User Value

Golfers already add friends via friend codes and manage requests through the inbox — but once a friendship is accepted, there's nothing to see or do. A feed of friends' recent rounds gives users a reason to open the social tab every day: they can celebrate a friend's birdie round, spot who played a new course, and stay connected to their group's game without group texts. It also surfaces the app's core value (tracked rounds, handicap progress) to second-degree users who haven't signed up yet if we add an optional public preview link per feed item.

---

## Technical Approach

### No DB migration needed
The schema already has everything required: `users.rounds`, `users.users`, and `users.friendships` with a `status='accepted'` filter.

### 1. New DB query — `database/repositories/round_repo.py`
Add `get_friend_rounds(user_id: str, limit: int = 20) -> list[dict]`:

```sql
SELECT
    r.id, r.round_date, r.total_score, r.tee_box, r.notes,
    r.course_name_played,
    u.id AS friend_user_id,
    u.username AS friend_username,
    u.friend_code,
    c.name AS course_name,
    c.location AS course_location,
    c.par AS course_par
FROM users.rounds r
JOIN users.users u ON r.user_id = u.id
LEFT JOIN courses.courses c ON r.course_id = c.id
JOIN users.friendships f
    ON (f.requester_id = $1 AND f.addressee_id = r.user_id)
    OR (f.addressee_id = $1 AND f.requester_id = r.user_id)
WHERE f.status = 'accepted'
  AND r.round_date IS NOT NULL
ORDER BY r.round_date DESC, r.id DESC
LIMIT $2
```

Add a corresponding `get_friend_round_count(user_id)` if pagination is needed later.

### 2. New API endpoint — `api/routers/social.py` (new file)

```
GET /api/social/feed/{user_id}?limit=20
```

- Auth-gated: `current_user.id` must equal `user_id`.
- Returns a list of `FriendRoundSummary` objects (round date, score, to_par, course name, friend username, friend_code).
- Register in `api/main.py` under prefix `/api/social`.

New response model in `api/schemas.py`:
```python
class FriendRoundSummary(BaseModel):
    round_id: str
    friend_username: str
    friend_user_id: str
    round_date: date | None
    course_name: str | None
    course_location: str | None
    total_score: int | None
    to_par: int | None
    tee_box: str | None
```

### 3. API client — `frontend/src/lib/api.ts`
Add `getFriendFeed(userId: string, limit?: number): Promise<FriendRoundSummary[]>`.

### 4. Type — `frontend/src/types/golf.ts`
Add `FriendRoundSummary` interface mirroring the backend schema.

### 5. UI — `frontend/src/pages/SocialPage.tsx`
Add a "Recent Activity" section below the friends list using `useQuery` with key `["friend-feed"]`. Each feed item shows:
- Friend's username + avatar initial chip
- Course name + date
- Score badge (with to-par coloring from the existing score-type palette)
- Link to `/rounds/:roundId` (only visible if current user === friend, else omit or show a future public-view route)

Use the same card style as the rest of the Social page (`bg-white rounded-xl border border-gray-200 shadow-sm p-5`). Empty state: "No activity yet — add friends to see their rounds here."

---

## Files to Change / Add

| File | Change |
|---|---|
| `database/repositories/round_repo.py` | Add `get_friend_rounds()` method |
| `database/db_manager.py` | Expose new method if needed |
| `api/routers/social.py` | **New file** — feed endpoint |
| `api/main.py` | Register new router |
| `api/schemas.py` | Add `FriendRoundSummary` response model |
| `frontend/src/lib/api.ts` | Add `getFriendFeed()` |
| `frontend/src/types/golf.ts` | Add `FriendRoundSummary` type |
| `frontend/src/pages/SocialPage.tsx` | Add activity feed section |

**No DB migration required.**

---

## Estimated Complexity

**Medium** — 8 files touched, no schema changes, clean query on existing indexed columns, standard React Query pattern already used throughout the app.

---

## Acceptance Criteria

- [ ] `GET /api/social/feed/{user_id}` returns up to 20 recent rounds from accepted friends, ordered by date desc; returns 403 for a different authenticated user.
- [ ] Feed items include: friend username, course name (or `course_name_played` fallback), round date, total score, and to-par value.
- [ ] The Social page renders a "Recent Activity" section below the friends list populated with feed items; each card displays the score badge using the app's existing to-par color palette.
- [ ] When the user has no accepted friends (or friends have no rounds), a friendly empty-state message is shown.
- [ ] The query uses existing indexes (`idx_friendships_status`, `idx_rounds_user_date`) and completes in < 100ms on a typical dataset.
