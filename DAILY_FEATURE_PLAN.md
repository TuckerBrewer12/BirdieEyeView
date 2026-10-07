# Daily Feature Plan — 2026-10-07

## Feature: Friend Activity Feed

**One-line description:** A live feed on the Social page showing friends' recent rounds — course, date, score, and to-par — so the friends system is actually useful.

---

## User Value

Right now a golfer can add friends via friend code, but after accepting there is nothing to see or do with them. The social layer is effectively decorative. A feed that surfaces "Tucker shot a 78 at Torrey Pines yesterday (−2)" gives players a reason to:

1. Keep scanning scorecards (your rounds appear in friends' feeds)
2. Check back daily (new rounds from playing partners)
3. Engage socially without leaving the app (bragging rights, friendly rivalry)

Golfers already text each other scores after rounds. This replaces those texts with structured data linked to full round details already in the app.

---

## Technical Approach

### Backend — new feed endpoint

**`api/routers/users.py`** — add one new route:

```
GET /api/users/me/friends/feed?limit=20&before=<round_id>
```

Returns a paginated list of `FeedRoundItem` (serialised from `round_repo`). Each item contains: `round_id`, `round_date`, `total_score`, `total_to_par`, `course_name_played` / `course.name`, `user_id`, `display_name`, `handicap_index`.

**`database/repositories/round_repo.py`** — add `get_feed_for_user(user_id, friend_ids, limit, before_id)`:

```sql
SELECT
    r.id, r.round_date, r.total_score, r.total_to_par,
    r.course_name_played,
    c.name AS course_name,
    u.display_name, u.handicap_index
FROM users.rounds r
JOIN users.users u ON u.id = r.user_id
LEFT JOIN courses.courses c ON c.id = r.course_id
WHERE r.user_id = ANY($1::uuid[])
  AND ($2::uuid IS NULL OR r.id < $2)
ORDER BY r.round_date DESC, r.created_at DESC
LIMIT $3
```

Privacy: only accepted friend IDs are passed (resolved in the route handler via `db.friendships.list_for_user`).

**`database/db_manager.py`** — expose `rounds.get_feed_for_user`.

**`api/request_models.py`** — add `FeedRoundItem` response model.

**`database/converters.py`** — add `feed_round_row_to_dict` converter.

No migration needed — query reads existing tables only.

### Frontend — feed tab inside SocialPage

**`src/pages/SocialPage.tsx`** — add a "Feed" tab alongside "Add Friend" and "Friends". When selected, shows the feed list.

**`src/components/social/FeedRoundItem.tsx`** — new component (≈ 60 lines). Displays: avatar/initials chip, friend's name + round date, course name, total score with to-par badge coloured using existing score-type palette, link to `/rounds/<id>` (already viewable if `stats` endpoint's friend-check passes — it does: `can_view = ... or await db.friendships.are_friends(...)`).

**`src/lib/api.ts`** — add `getFriendFeed(limit?, before?)` function calling the new endpoint.

**`src/types/golf.ts`** or `src/types/analytics.ts`  — add `FeedRoundItem` type.

Use `@tanstack/react-query` `useInfiniteQuery` for cursor-based pagination (same pattern as rounds list). Skeleton loader during fetch reuses existing `LoadingSkeleton` pattern.

### Files to change

| File | Change |
|---|---|
| `api/routers/users.py` | Add `GET /me/friends/feed` route |
| `api/request_models.py` | Add `FeedRoundItem` Pydantic model |
| `database/repositories/round_repo.py` | Add `get_feed_for_user` query |
| `database/db_manager.py` | Expose new method |
| `database/converters.py` | Add `feed_round_row_to_dict` |
| `frontend/src/lib/api.ts` | Add `getFriendFeed()` |
| `frontend/src/types/golf.ts` | Add `FeedRoundItem` type |
| `frontend/src/pages/SocialPage.tsx` | Add Feed tab |
| `frontend/src/components/social/FeedRoundItem.tsx` | New component |

### New files

- `frontend/src/components/social/FeedRoundItem.tsx`

### DB migrations needed

None — this feature is purely additive, reading existing round/user/course/friendship tables.

---

## Estimated Complexity

**Medium** — ~300 lines of new code across 9 files. No schema changes. All data already exists; the work is wiring a query and a UI component. The privacy logic is already tested via `are_friends()`.

---

## Acceptance Criteria

- [ ] `GET /api/users/me/friends/feed` returns up to 20 recent rounds from accepted friends, sorted newest-first, with `display_name`, `course_name`, `total_score`, `total_to_par`, `round_date`.
- [ ] The Social page shows a "Feed" tab; when clicked it renders the friend feed (or a friendly empty state when the user has no friends / friends have no rounds).
- [ ] Each feed item links to the round detail page (`/rounds/<id>`); round detail is already accessible to friends via the existing `can_view` friend check in `stats.py`.
- [ ] Pagination works: scrolling to the bottom loads the next 20 items without duplicates (cursor-based on `round_id`).
- [ ] Users with no accepted friends see a clear prompt ("Add friends to see their rounds here") instead of an empty list.
