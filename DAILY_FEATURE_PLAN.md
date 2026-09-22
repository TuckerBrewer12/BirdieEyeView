# Daily Feature Plan — 2026-09-22

## Feature: Friends Activity Feed

**One-line description:** A scrollable in-app feed showing accepted friends' recent rounds, so golfers always know how their crew is playing.

---

## User Value

Right now the social layer is half-built: you can add friends with a friend code and accept/decline requests, but there is nothing to *do* with those friends inside the app. The "Social" page lists them; it goes no further.

A friends feed closes that loop:

- Opens the app on non-golf days (habit loop, retention driver)
- Creates social accountability — golfers play better when friends can see their scores
- Makes the scan-and-save flow feel worthwhile: your rounds reach an audience
- Pays off the investment already made in friendship infrastructure

---

## Technical Approach

### What already exists (no migration needed)

| Layer | What's there |
|---|---|
| DB | `users.friendships` (status, requester_id, addressee_id) |
| DB | `users.rounds` (user_id, round_date, total_score, course_name_played, tee_box_played) |
| DB | `users.users` (name, friend_code) |
| API | `DatabaseManager.rounds.get_round_summaries_for_user()` |
| API | Friendship endpoints on `api/routers/users.py` |
| Frontend | `SocialPage.tsx`, `FriendsInboxPage.tsx`, `useAuth` |
| Frontend | Round summary card design patterns (DashboardPage recent rounds list) |

### Backend changes

**New endpoint:** `GET /api/social/{user_id}/feed?limit=20&offset=0`

Add to a new `api/routers/social.py` (or append to existing `users.py`):

```python
# Pseudocode
@router.get("/{user_id}/feed")
async def get_friend_feed(user_id, limit, offset, db, current_user):
    # Auth: only own feed
    friends = await db.friendships.get_accepted_friend_ids(str(user_id))
    # Single JOIN query for efficiency (see below)
    rows = await db.rounds.get_feed_for_friends(friends, limit=limit, offset=offset)
    return [FeedItemResponse(**r) for r in rows]
```

**New DB query** in `database/repositories/round_repo.py`:

```sql
SELECT
    u.id AS friend_id,
    u.name AS friend_name,
    r.id AS round_id,
    r.round_date,
    r.total_score,
    COALESCE(c.name, r.course_name_played) AS course_name,
    COALESCE(c.par, NULL) AS course_par,
    r.tee_box_played
FROM users.rounds r
JOIN users.users u ON u.id = r.user_id
LEFT JOIN courses.courses c ON c.id = r.course_id
WHERE r.user_id = ANY($1::uuid[])   -- array of accepted friend IDs
ORDER BY r.round_date DESC NULLS LAST
LIMIT $2 OFFSET $3;
```

**New response model** in `api/schemas.py`:

```python
class FeedItemResponse(BaseModel):
    friend_id: str
    friend_name: str
    round_id: str
    round_date: Optional[date]
    total_score: Optional[int]
    course_name: Optional[str]
    course_par: Optional[int]
    to_par: Optional[int]   # computed: total_score - course_par
    tee_box: Optional[str]
```

### Frontend changes

**New route and page:** `src/pages/FeedPage.tsx`

- Add `/feed` route in `App.tsx`
- Navigation item in sidebar (between Social and Dashboard)

**Feed card component:** `src/components/social/FeedRoundCard.tsx`

```tsx
// Shows: friend's initials avatar | course name | score | to-par chip | date
// Tapping navigates to /rounds/{round_id} (read-only view of friend's round)
// Design: matches DashboardPage recent-rounds row styling
```

**API client addition** in `src/lib/api.ts`:

```ts
getFeed: (userId: string, limit = 20, offset = 0) =>
  get<FeedItem[]>(`/api/social/${userId}/feed?limit=${limit}&offset=${offset}`)
```

**Empty state:** "Add friends to see their rounds here." with a link to `/social`.

### Files to change / add

| File | Change |
|---|---|
| `api/routers/social.py` | NEW — feed endpoint |
| `api/main.py` | Register new `social` router at `/api/social` |
| `api/schemas.py` | Add `FeedItemResponse` |
| `database/repositories/round_repo.py` | Add `get_feed_for_friends()` method |
| `database/repositories/friendship_repo.py` | Add `get_accepted_friend_ids()` (or inline in user_repo) |
| `database/db_manager.py` | Expose new query if needed |
| `src/pages/FeedPage.tsx` | NEW — feed page |
| `src/components/social/FeedRoundCard.tsx` | NEW — single feed item card |
| `src/lib/api.ts` | Add `getFeed()` |
| `src/App.tsx` | Add `/feed` route |
| Sidebar nav component | Add Feed nav item |

### No DB migrations needed

All required tables (`users.rounds`, `users.friendships`, `users.users`, `courses.courses`) exist in the current schema.

---

## Estimated Complexity

**Medium** (~1–2 days of focused work)

- Backend: ~80 lines (new router + one JOIN query + response model)
- Frontend: ~150 lines (FeedPage + FeedRoundCard + api method + routing)
- Risk: low — read-only query over existing tables, no new state machines

---

## Acceptance Criteria

1. **Feed loads** — authenticated user hits `/feed` and sees a list of accepted friends' recent rounds (up to 20), ordered newest first.
2. **Round card accuracy** — each feed item shows the correct friend name, course name, total score, to-par value, and round date.
3. **Privacy enforced** — only accepted friends appear; pending, declined, and blocked friendships are excluded. Users cannot access another user's feed.
4. **Empty state handled** — if the user has no accepted friends, or accepted friends have no rounds, a friendly empty-state message is shown with a link to add friends.
5. **Navigation** — the feed page is reachable from the sidebar and from the Social page; tapping a feed item navigates to the round detail view (read-only if it belongs to a friend).
