# Daily Feature Plan — 2026-09-19

## Feature: Friends Activity Feed

**One-line description:** Show a live feed of friends' recent rounds on the Social page so golfers can celebrate and compete casually.

---

## User Value

The friendship system is fully built — users can add friends via friend codes and accept/decline requests — but the Social page has nothing to *show* once a connection is made. Right now a golfer adds a friend and then... nothing changes. There is no way to see what your buddies shot, celebrate a good round, or casually track who's improving.

Adding a feed of friends' recent rounds completes the social loop: the infra already exists, this just surfaces it. Golfers are inherently competitive and social; this is the single feature most likely to drive daily opens of the app.

---

## Technical Approach

### No DB migration required
All the tables needed already exist: `users.friendships`, `users.rounds`, `users.hole_scores`, `users.users`.

### Backend — 2 changes

**1. `database/repositories/round_repo.py`** — add `get_friend_rounds(user_id, limit, offset)`:
```python
async def get_friend_rounds(
    self, user_id: str, limit: int = 20, offset: int = 0
) -> list[dict]:
    """Return recent round summaries for all accepted friends of user_id."""
    async with self._pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                r.id, r.total_score, r.played_at, r.tee_box, r.course_name_played,
                c.name AS course_name, c.location AS course_location,
                u.id AS friend_id, u.name AS friend_name
            FROM users.rounds r
            JOIN users.users u ON u.id = r.user_id
            LEFT JOIN courses.courses c ON c.id = r.course_id
            WHERE r.user_id IN (
                SELECT CASE
                    WHEN requester_id = $1 THEN addressee_id
                    ELSE requester_id
                END
                FROM users.friendships
                WHERE status = 'accepted'
                  AND (requester_id = $1 OR addressee_id = $1)
            )
            ORDER BY r.played_at DESC NULLS LAST
            LIMIT $2 OFFSET $3
            """,
            user_id, limit, offset,
        )
        return [dict(r) for r in rows]
```

**2. `api/routers/rounds.py`** — add new endpoint:
```python
@router.get("/friends")
async def get_friend_rounds(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = await db.rounds.get_friend_rounds(
        str(current_user.id), limit=limit, offset=offset
    )
    return {"activity": rows, "has_more": len(rows) == limit}
```
Wire it up in `api/main.py` under the existing rounds router (no new file).

### Frontend — 3 changes

**3. `frontend/src/lib/api.ts`** — add method:
```ts
getFriendActivity: (limit = 20, offset = 0) =>
  fetchJSON<{ activity: FriendActivityItem[]; has_more: boolean }>(
    `/api/rounds/friends?limit=${limit}&offset=${offset}`
  ),
```

**4. `frontend/src/types/golf.ts` (or `analytics.ts`)** — add type:
```ts
export interface FriendActivityItem {
  id: string;
  friend_id: string;
  friend_name: string;
  total_score: number | null;
  played_at: string | null;
  tee_box: string | null;
  course_name: string | null;
  course_name_played: string | null;
  course_location: string | null;
}
```

**5. `frontend/src/pages/SocialPage.tsx`** — add "Recent Activity" section below the Friends list:
- `useQuery({ queryKey: ["friend-activity"], queryFn: () => api.getFriendActivity() })`
- Renders a list of cards: friend name, course (resolved via `course_name ?? course_name_played ?? "Unknown course"`), total score, to-par pill, relative date (`2 days ago`)
- Each card links to `/rounds/{id}` (RoundDetailPage already enforces `are_friends` auth check)
- "Load more" button using `offset` pagination
- Empty state: "Your friends haven't logged any rounds yet. Share your friend code to connect."
- Loading skeleton: 3 animated placeholder cards

---

## Estimated Complexity

**Medium**

- Backend: ~40 lines (one SQL query + one endpoint)
- Frontend: ~80 lines (query + UI in SocialPage)
- No migration, no new dependencies, no new files required

---

## Acceptance Criteria

- [ ] Authenticated users see a "Recent Activity" section on `/social` listing the most recent 20 rounds from accepted friends, ordered newest first
- [ ] Each activity card shows: friend name, resolved course name, total score, to-par (color-coded), and a human-readable relative date
- [ ] Clicking any card navigates to `/rounds/{id}`; the existing friend-auth guard on RoundDetailPage prevents unauthorized access
- [ ] A "Load more" button appears when `has_more: true` and appends the next page without replacing existing cards
- [ ] The section shows a graceful empty state when the current user has no accepted friends or none have logged rounds
- [ ] Pending, declined, and blocked friendships are excluded from the feed
