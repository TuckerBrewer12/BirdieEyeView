# Daily Feature Plan — 2026-09-25

## Feature: Friend Activity Feed

**One-line description:** Show friends' recent rounds on the Social page so golfers can see what their playing partners have been scoring.

---

## User Value

After a golfer adds friends via friend code, the Social page currently shows nothing but a name and email — there is no reason to return to it. Golfers are intrinsically motivated to compare with their buddies: "Did Tucker break 80 at Riviera? How did Maya do on Sunday?" A feed of recent friend rounds drives daily retention, gives context for The Lab's friend-comparison chart, and makes the friendship system feel real rather than ornamental.

---

## Technical Approach

### Backend — 1 new endpoint, 1 new DB query

**`api/routers/rounds.py`** — add route:

```
GET /api/rounds/friends/feed
```

- Auth-gated: requires `current_user` via `get_current_user` dependency.
- Calls new `round_repo.get_friend_rounds_feed(user_id, limit=20)`.
- Returns a list of `FriendRoundSummary` objects (defined in `api/request_models.py`).

**`database/repositories/round_repo.py`** — add method `get_friend_rounds_feed`:

```sql
SELECT
    r.id,
    r.total_score,
    r.played_at,
    r.course_name_played,
    r.tee_box,
    u.id   AS friend_id,
    u.name AS friend_name,
    c.name AS course_name,
    c.location AS course_location
FROM users.rounds r
JOIN users.users u ON r.user_id = u.id
LEFT JOIN courses.courses c ON r.course_id = c.id
WHERE r.user_id IN (
    SELECT
        CASE WHEN requester_id = $1 THEN addressee_id
             ELSE requester_id END
    FROM users.friendships
    WHERE (requester_id = $1 OR addressee_id = $1)
      AND status = 'accepted'
)
ORDER BY r.played_at DESC NULLS LAST
LIMIT $2
```

Uses existing `users.friendships` table (migration 005) — no migration needed.

**`api/request_models.py`** — add `FriendRoundSummary`:

```python
class FriendRoundSummary(BaseModel):
    id: str
    friend_id: str
    friend_name: str
    total_score: Optional[int]
    played_at: Optional[str]
    course_name: Optional[str]
    course_location: Optional[str]
    tee_box: Optional[str]
```

### Frontend — 1 new component, 1 API method, Social page update

**`frontend/src/lib/api.ts`** — add:

```ts
getFriendFeed: () =>
  fetchJSON<FriendRoundSummary[]>(`/rounds/friends/feed`),
```

**`frontend/src/components/social/FriendActivityFeed.tsx`** — new component:
- Renders a "Recent Activity" section with `useQuery` calling `api.getFriendFeed()`.
- Each card: friend avatar (initials), friend name, course name, date, score with to-par badge.
- Score badge uses existing score-type color tokens from the design system.
- Empty state: "Your friends haven't logged any rounds yet."
- Card links to `/rounds/{id}` (existing read-only round detail page).

**`frontend/src/pages/SocialPage.tsx`** — import and render `<FriendActivityFeed />` below the friends list section.

**`frontend/src/types/golf.ts`** (or `frontend/src/types/social.ts`) — add `FriendRoundSummary` type.

### No DB migration required

All needed tables exist: `users.friendships` (migration 005), `users.rounds`, `users.users`, `courses.courses`.

---

## Estimated Complexity

**Medium** — approximately 2–3 days of focused work.

- Backend: ~80 lines (new route + repo method + response model)
- Frontend: ~200 lines (API method + type + feed component + Social page wiring)
- No schema changes, no new dependencies

---

## Acceptance Criteria

- [ ] `GET /api/rounds/friends/feed` returns the 20 most recent rounds from accepted friends, ordered by `played_at DESC`, authenticated.
- [ ] The Social page shows a "Recent Activity" section that loads the feed; a loading skeleton is shown while fetching.
- [ ] Each activity card displays: friend's name, course name (or `course_name_played` fallback), date, total score, and a colored to-par badge using the app's existing score-type color tokens.
- [ ] Clicking an activity card navigates to `/rounds/{id}` (existing round detail page), which already handles read-only viewing via the `getRound` endpoint (no extra permissions work needed since `round_repo.get_round` is public within the app).
- [ ] If the user has no accepted friends, or friends have no rounds, an empty-state message is shown rather than a blank section.
