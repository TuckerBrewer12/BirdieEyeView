# Daily Feature Plan — 2026-10-31

## Feature: Round Sharing & Friend Feed

**One-line description:** Let players share a completed round with friends and see a live feed of their friends' rounds.

---

## User Value

Golf is inherently social — bragging about a birdie run or commiserating over a triple bogey is half the game. The friends/inbox infrastructure is already live, but there is no way to actually *share* anything. Adding round sharing turns the app from a personal log into a social experience: players will open it after every round to post their score, see what their buddies shot, and compare handicap differentials. This is the Strava model applied to golf — proven to be the #1 retention and word-of-mouth driver in fitness tracking apps. Every shared round is also a natural referral prompt ("Hey, download ScanScorecards — I just posted my round").

---

## Technical Approach

### 1. Database migration — `013_add_round_shares.sql`

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS users.round_shares (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id    UUID NOT NULL REFERENCES users.rounds(id) ON DELETE CASCADE,
    shared_by   UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    message     VARCHAR(280),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_round_shares_shared_by   ON users.round_shares (shared_by);
CREATE INDEX IF NOT EXISTS idx_round_shares_round_id    ON users.round_shares (round_id);
CREATE INDEX IF NOT EXISTS idx_round_shares_created_at  ON users.round_shares (created_at DESC);

COMMIT;
```

No per-recipient row needed yet — visibility is friend-graph-scoped: anyone accepted as a friend of `shared_by` can see it.

### 2. Backend changes

**New repository method** — `database/repositories/round_repo.py`
- `share_round(round_id, user_id, message) → round_share_id`
- `get_feed_for_user(user_id, limit, before_id) → list[FeedItem]`
  - JOINs `round_shares` → `rounds` → `users` → `courses` → `friendships` to return only rounds shared by accepted friends of `user_id`

**New router** — `api/routers/feed.py`
```
POST /api/rounds/{round_id}/share      — share a round (body: {message?})
GET  /api/users/{user_id}/feed         — paginated friend feed (query: limit, before_id)
DELETE /api/rounds/{round_id}/share    — un-share (own share only)
```

**Register router** in `api/main.py`:
```python
from api.routers import feed
app.include_router(feed.router, prefix="/api")
```

**New response schema** in `api/schemas.py` — `FeedItemResponse`:
```python
class FeedItemResponse(BaseModel):
    share_id: str
    round_id: str
    shared_by_user_id: str
    shared_by_name: str
    course_name: Optional[str]
    round_date: Optional[date]
    total_score: Optional[int]
    to_par: Optional[int]
    message: Optional[str]
    created_at: datetime
```

### 3. Frontend changes

**New component** — `frontend/src/components/share/ShareRoundModal.tsx`
- Triggered from a "Share" button on `RoundDetailPage.tsx` (add to the header action row)
- Textarea for optional message (≤280 chars), "Share with friends" CTA
- Calls `POST /api/rounds/{id}/share`
- Shows success toast using the existing toast pattern

**New page** — `frontend/src/pages/FeedPage.tsx` + `frontend/src/pages/feed/` directory
- Route: `/feed`
- Infinite scroll (or load-more) list of friend feed items
- Each card: avatar initials, friend name, course name, score vs par, date, message
- Clicking a card opens `RoundDetailPage` for that round
- Empty state: "No rounds shared yet — share yours or add more friends"
- Uses `useInfiniteQuery` from TanStack Query with `before_id` cursor pagination

**API client** — `frontend/src/lib/api.ts`
- Add `shareRound(roundId, message?)`, `getFeed(userId, params)`, `unshareRound(roundId)`

**Navigation** — `frontend/src/components/layout/` (sidebar/bottom nav)
- Add Feed link (bell/feed icon) between Social and Dashboard

**Existing files to modify:**
| File | Change |
|---|---|
| `frontend/src/pages/RoundDetailPage.tsx` | Add Share button in header action row |
| `frontend/src/lib/api.ts` | 3 new API helpers |
| `frontend/src/App.tsx` | Register `/feed` route |
| `api/main.py` | Register feed router |
| `database/db_manager.py` | Expose `share_round` / `get_feed_for_user` via facade |

**New files to create:**
- `database/migrations/013_add_round_shares.sql`
- `api/routers/feed.py`
- `frontend/src/pages/FeedPage.tsx`
- `frontend/src/pages/feed/` (index + view model hook)
- `frontend/src/components/share/ShareRoundModal.tsx`

---

## Estimated Complexity

**Medium** — The friend graph and round data are already in place; this feature stitches them together. No new auth flows, no ML, no external services. The main work is one migration, two new API endpoints with a multi-table JOIN, and two new React components. Estimated: 1–2 focused dev sessions.

---

## Acceptance Criteria

- [ ] A player can tap "Share" on any of their rounds in `RoundDetailPage` and post it to their friend feed with an optional message (≤280 chars).
- [ ] The `/feed` page shows a reverse-chronological list of rounds shared by accepted friends; items from non-friends never appear.
- [ ] Feed items display course name, date, score, to-par, the sharer's name, and the message (if any); tapping navigates to the full round detail.
- [ ] A player can delete their own share (un-share); the item disappears from friends' feeds immediately on next load.
- [ ] Feed loads correctly when a player has zero friends, zero shares from friends, or more than 20 feed items (pagination works).
