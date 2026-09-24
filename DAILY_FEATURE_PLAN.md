# Daily Feature Plan — 2026-09-24

## Feature: Friends Activity Feed

**One-line description:** A social feed showing recent rounds from accepted friends, turning ScanScorecards into a daily-open golf social app.

---

## User Value

Right now the social graph (friends, inbox, friend codes) is fully wired — but after adding a friend there's nothing to *do* with them. Friends can technically view each other's analytics, but there's no way to casually check what a buddy shot last weekend without navigating directly to their profile.

A feed solves this:
- **Daily engagement loop**: golfers open the app to see what their friends shot, not just to log their own round
- **Social motivation**: seeing a friend go low creates accountability and friendly competition
- **Discovery**: friends' rounds surface courses you haven't played yet
- **Celebration moment**: friends can see your best round without you having to manually share it

This is the logical next step once friends exist. The infrastructure is all there — it just needs to be connected.

---

## Technical Approach

### Backend

**New router: `api/routers/feed.py`**

Single endpoint:
```
GET /api/feed?limit=20&before=<round_id_cursor>
```

- Auth-gated (`get_current_user` dependency, already standard)
- SQL: join `users.rounds` with `users.friendships` to fetch recent rounds from accepted friends
- Returns paginated list of feed items (round summary + user display info)
- Cursor-based pagination using `round_id` (UUID, stable order with `round_date`)

Core query (asyncpg):
```sql
SELECT
  r.id, r.round_date, r.total_score, r.course_name_played, r.tee_box,
  u.id AS author_id, u.name AS author_name,
  c.name AS course_name, c.location AS course_location
FROM users.rounds r
JOIN users.users u ON u.id = r.user_id
LEFT JOIN courses.courses c ON c.id = r.course_id
WHERE r.user_id IN (
  SELECT CASE
    WHEN f.requester_id = $1 THEN f.addressee_id
    ELSE f.requester_id
  END
  FROM users.friendships f
  WHERE (f.requester_id = $1 OR f.addressee_id = $1)
    AND f.status = 'accepted'
)
AND ($2::uuid IS NULL OR r.id < $2)
ORDER BY r.round_date DESC, r.id DESC
LIMIT $3
```

**New file: `api/routers/feed.py`**

**New response model in `api/schemas.py`:**
```python
class FeedItem(BaseModel):
    round_id: str
    round_date: Optional[date]
    author_id: str
    author_name: str
    total_score: Optional[int]
    course_name: Optional[str]
    course_location: Optional[str]
    tee_box: Optional[str]

class FeedResponse(BaseModel):
    items: List[FeedItem]
    next_cursor: Optional[str]  # last round_id for pagination
```

**Wire into `api/main.py`:** add `app.include_router(feed.router, prefix="/api/feed")`

**No DB migration needed** — all data already exists in `users.rounds`, `users.friendships`, `users.users`, `courses.courses`.

---

### Frontend

**New API method in `src/lib/api.ts`:**
```ts
getFeed: (limit?: number, before?: string) => fetchJSON<FeedResponse>(`/feed?limit=${limit ?? 20}${before ? `&before=${before}` : ''}`)
```

**New type in `src/types/golf.ts` or a new `src/types/feed.ts`:**
```ts
interface FeedItem {
  round_id: string;
  round_date: string | null;
  author_id: string;
  author_name: string;
  total_score: number | null;
  course_name: string | null;
  course_location: string | null;
  tee_box: string | null;
}
```

**New component: `src/components/social/FeedCard.tsx`**
- Shows: author avatar initials, name, date, course name + location, total score badge (with to-par color coding), tee box pill
- Links to the round detail page for that friend (already accessible since `analytics` endpoint gates by friendship)
- Uses the existing card style: `bg-white rounded-2xl border border-gray-100 shadow-sm p-5`
- Score badge reuses the score-type color tokens from the design system

**New component: `src/components/social/ActivityFeed.tsx`**
- Infinite scroll via `IntersectionObserver` on a sentinel div
- Calls `getFeed` with cursor from last item
- Shows skeleton loaders while fetching next page
- Empty state: "Your friends haven't posted any rounds yet. Add more friends to see their activity!"

**Update `src/pages/SocialPage.tsx`**
- Add an `ActivityFeed` section below the existing friends list
- Section header: "Recent Activity" with section label style

---

### Files to Change / Add

| File | Change |
|---|---|
| `api/routers/feed.py` | **New** — feed endpoint |
| `api/main.py` | +1 line: include feed router |
| `api/schemas.py` | Add `FeedItem`, `FeedResponse` models |
| `database/repositories/round_repo.py` | Add `get_feed_for_user()` async method |
| `frontend/src/lib/api.ts` | Add `getFeed` method |
| `frontend/src/types/feed.ts` | **New** — `FeedItem`, `FeedResponse` types |
| `frontend/src/components/social/FeedCard.tsx` | **New** — single feed item card |
| `frontend/src/components/social/ActivityFeed.tsx` | **New** — paginated feed list |
| `frontend/src/pages/SocialPage.tsx` | Add `ActivityFeed` section |

**No DB migration required.**

---

## Estimated Complexity

**Medium** (~1.5 days of focused work)

- Backend: ~3–4 hours (SQL query, endpoint, schema, repo method)
- Frontend: ~5–6 hours (3 new components, api wiring, pagination logic)
- Testing: ~1 hour (unit test for feed SQL, manual flow test)

---

## Acceptance Criteria

- [ ] `GET /api/feed` returns rounds from accepted friends, ordered by `round_date DESC`, limited to 20 per page with cursor-based pagination
- [ ] Feed items are not returned for pending/declined/blocked friendships — only `status = 'accepted'`
- [ ] The user's own rounds never appear in their feed
- [ ] `SocialPage` shows an "Recent Activity" section with `FeedCard` components; an empty state renders when the user has no friends or friends have no rounds
- [ ] Scrolling to the bottom of the feed loads the next page (infinite scroll); a spinner shows during loading and a "No more rounds" message shows at the end
