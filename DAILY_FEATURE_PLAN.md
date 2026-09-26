# Daily Feature Plan — 2026-09-26

## Feature: Friend Activity Feed

**One-line description:** Show a chronological feed of accepted friends' recent rounds so the social layer has actual content to consume.

---

## User Value

Golfers added friends but have nothing to see on the Social page — there's no payoff. An activity feed closes this loop: you see a friend shoot +4 at Torrey Pines, you're motivated to post your own round, beat their score, or trash-talk in iMessage. It's the primary retention mechanic for any social sports app. The friendship infrastructure (friend codes, requests, accept/decline) is fully wired; the feed is the missing payoff.

---

## Technical Approach

### Backend

**New endpoint: `GET /api/feed` (or add to `api/routers/stats.py`)**

Recommended: create `api/routers/feed.py` to keep it clean.

```python
GET /api/feed?limit=20&offset=0
```

- Auth-gated: `Depends(get_current_user)` — only your own feed
- Query accepted friendships for `current_user.id` (both requester + addressee)
- Join `users.rounds` for those friend user_ids, sorted by `played_at DESC`
- Also include the current user's own recent rounds (so the feed doesn't feel empty on first open)
- Return per-round: `user_id`, `display_name` (from `users.users.display_name` or email prefix), `round_id`, `played_at`, `course_name_played` (or course name from join), `total_score`, `handicap_index` at time of round (approximated from stored `handicap_index` on user), `hole_count`
- To-par calculation: sum `par_played` from `hole_scores` for each round

**Files to change:**
- `api/routers/feed.py` — new file, new router
- `api/main.py` — register `feed_router` at `/api/feed`
- `api/schemas.py` — add `FeedItemResponse`, `FeedResponse` Pydantic models
- No DB migration needed — uses `users.friendships`, `users.rounds`, `users.hole_scores`, `users.users`

**Raw SQL sketch (asyncpg):**
```sql
SELECT
    r.id AS round_id,
    r.user_id,
    u.display_name,
    r.played_at,
    COALESCE(c.name, r.course_name_played) AS course_name,
    r.total_score,
    SUM(hs.par_played) AS course_par
FROM users.rounds r
JOIN users.users u ON u.id = r.user_id
LEFT JOIN courses.courses c ON c.id = r.course_id
LEFT JOIN users.hole_scores hs ON hs.round_id = r.id
WHERE r.user_id = ANY($1::uuid[])   -- $1 = [current_user_id, ...friend_ids]
  AND r.played_at IS NOT NULL
GROUP BY r.id, u.display_name, c.name
ORDER BY r.played_at DESC
LIMIT $2 OFFSET $3
```

### Frontend

**New component: `FeedSection` in `frontend/src/components/social/FeedSection.tsx`**

- Renders inside `SocialPage.tsx` above the friend-list section (or as the main content when user has friends)
- Each feed item: initials avatar (bg-primary/10, text-primary), friend name, course name, date (relative: "2 days ago"), score bubble colored by to-par (use existing score-type color palette from design system), to-par badge (+4, -1, E)
- Empty state: "Add friends to see their rounds here." with friend-code input below
- Loading skeleton: 3 gray placeholder cards

**Files to change:**
- `frontend/src/components/social/FeedSection.tsx` — new file
- `frontend/src/pages/SocialPage.tsx` — import + render `<FeedSection>` at top
- `frontend/src/lib/api.ts` — add `getFeed(limit, offset): Promise<FeedItem[]>`
- `frontend/src/types/golf.ts` — add `FeedItem` type

**No new DB migration needed.** All data already exists.

---

## Estimated Complexity

**Medium** — ~1–2 days of focused work.

- Backend: 1 new file, 1 SQL query, 2 Pydantic models, 1 main.py line. Straightforward.
- Frontend: 1 new component, 2 small edits. Design matches existing card + score-type color patterns exactly.
- No migrations, no new tables, no LLM calls.

---

## Acceptance Criteria

- [ ] `GET /api/feed` returns the current user's own rounds + accepted friends' rounds, sorted newest-first, with `to_par` correctly calculated per round.
- [ ] Feed items are visible on the Social page, each showing: friend name, course, date, total score, and a to-par badge colored using the app's score-type palette.
- [ ] Unauthenticated requests return 401; requests for another user's feed return 403.
- [ ] Empty state is shown when the user has no friends yet (not an error, not a blank page).
- [ ] Feed is paginated (`limit`/`offset`) and the frontend loads the first 20 items on mount.
