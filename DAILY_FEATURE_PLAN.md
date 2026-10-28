# Daily Feature Plan — 2026-10-28

## Feature: Friend Round Feed

**One-line description:** A social activity feed on the Social page showing friends' recently saved rounds as interactive score cards, completing the social loop.

---

## User Value

Golfers already use the app to scan and save rounds. The friendships system is fully built (friend codes, inbox, accepted connections) — but there's no payoff: you can add friends and nothing happens. A round feed closes that loop.

**Why this matters:**
- After saving a round, golfers naturally want to share it ("I just shot an 84!")
- Seeing friends' rounds creates a lightweight accountability/motivation layer
- The `ShareCard.tsx` SVG scorecard component is already built — it just needs to be surfaced in a feed
- Retention: users come back to check what their friends shot, not just to log their own rounds
- The friends table, rounds API, and ShareCard are all ready — this is assembly, not invention

---

## Technical Approach

### Backend

**New endpoint:** `GET /api/social/feed/{user_id}?limit=20&offset=0`

File: `api/routers/social.py` (new file, or add to existing `users.py`)

Logic:
1. Verify `current_user.id == user_id` (ownership check, same pattern as other endpoints)
2. Query accepted friendships for this user (both `requester_id` and `addressee_id`)
3. Fetch the `N` most recent rounds from those friend user IDs, joined with `course_name_played` and basic hole scores
4. Return a paginated list of `FeedRoundResponse` objects

```python
# api/schemas.py — add:
class FeedRoundResponse(BaseModel):
    round_id: UUID
    user_id: UUID
    display_name: str          # from users.users
    played_on: Optional[date]
    course_name: Optional[str]
    total_score: Optional[int]
    score_to_par: Optional[int]
    tee_box: Optional[str]
    hole_scores: List[HoleScoreSummary]  # hole_number + strokes only

class FeedResponse(BaseModel):
    items: List[FeedRoundResponse]
    has_more: bool
```

SQL sketch (add to `repositories/round_repo.py`):
```sql
SELECT r.*, u.display_name
FROM users.rounds r
JOIN users.users u ON u.id = r.user_id
WHERE r.user_id = ANY($1::uuid[])  -- friend_ids
  AND r.is_deleted IS NOT TRUE
ORDER BY r.played_on DESC NULLS LAST, r.created_at DESC
LIMIT $2 OFFSET $3
```

**Files to change/add:**
- `api/routers/social.py` — new router with `GET /api/social/feed/{user_id}`
- `api/main.py` — register new router with prefix `/api/social`
- `api/schemas.py` — add `FeedRoundResponse`, `FeedResponse`
- `database/repositories/round_repo.py` — add `get_feed_rounds(friend_ids, limit, offset)`

No DB migration needed — reads from existing `users.rounds`, `users.friendships`, `users.users`.

### Frontend

**New section on `SocialPage.tsx`:** below the friends list, add "Recent Rounds" feed tab/section.

The existing `ShareCard.tsx` component renders a full SVG scorecard — use it inside a compact card wrapper with friend's name and date above it.

**Files to change/add:**
- `src/lib/api.ts` — add `getFeed(userId, limit, offset)` API helper
- `src/pages/SocialPage.tsx` — add feed section (below friends list or new "Feed" tab)
- `src/components/social/FeedCard.tsx` — new component: wraps `ShareCard` with friend name, course, score, date, and a "View Round" link
- `src/types/social.ts` — add `FeedRound` type matching the API response

**UI spec (matching design system):**
- Feed cards: `bg-white rounded-2xl border border-gray-100 shadow-sm p-4` (standard card style)
- Friend name: `text-sm font-semibold text-gray-800` + small avatar initials pill
- Score badge: score-type color (birdie green, bogey red, etc.) matching existing semantic colors
- "View Round" → `RoundDetailPage` link
- Infinite scroll or "Load more" button (same pattern as RoundsPage)
- Empty state: "Add friends to see their rounds here" with friend-code CTA

---

## Estimated Complexity

**Medium**

- Backend endpoint is straightforward — the query joins two existing tables
- No new DB schema needed
- `ShareCard` component already handles the visual heavy lifting
- Main effort: wiring API → frontend, designing the feed card layout, pagination

Estimate: ~1 day of focused work for a polished v1.

---

## Acceptance Criteria

- [ ] `GET /api/social/feed/{user_id}` returns the 20 most recent rounds from accepted friends, ordered by `played_on` DESC, with `total_score`, `score_to_par`, `course_name`, and per-hole strokes
- [ ] The Social page (`/social`) shows a "Friends' Rounds" section with feed cards below the existing friends list; each card shows the friend's name, course, date, score (colored by score type), and a "View" link
- [ ] Users with no accepted friends see a friendly empty state with a CTA to add friends via friend code
- [ ] The feed is paginated; a "Load more" button fetches the next page without re-fetching earlier results
- [ ] The endpoint returns 403 if the requesting user is not the authenticated user (ownership check matches the pattern in `rounds.py`)
