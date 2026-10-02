# Daily Feature Plan — 2026-10-02

## Feature: Friend Round Feed

**One-line description:** Let golfers share individual rounds to their friends, who see them in a social feed inside the Social page.

---

## User Value

The friends/friend-code system is already live, but once you add a friend there's nothing to see — the Social page is a dead end. Golf is inherently social (scorecards get posted to group chats, handicap comparisons are a staple), so the most natural next step is letting users share a round and see what their friends are posting.

A shareable round unlocks:
- **Bragging rights** — post a career-best round; friends see it instantly.
- **Accountability** — friends' recent scores are visible, keeping users engaged between rounds.
- **Retention** — social feed creates a reason to open the app even when not scanning.

The `ShareCard` SVG component (already in `frontend/src/components/share/ShareCard.tsx`) provides a polished card-style visualization that can render inline in the feed without extra design work.

---

## Technical Approach

### 1. Database migration — `013_round_shares.sql`

```sql
-- Add optional shared flag to rounds
ALTER TABLE users.rounds ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP DEFAULT NULL;

-- Feed query index
CREATE INDEX IF NOT EXISTS idx_rounds_shared_at ON users.rounds (shared_at)
    WHERE shared_at IS NOT NULL;
```

No junction table needed: a nullable `shared_at` timestamp on `rounds` is enough for v1. "Unshare" = set to NULL. Feed query joins friends → their shared rounds ordered by `shared_at DESC`.

**File:** `database/migrations/013_round_shares.sql`

### 2. Backend — round share endpoints

**`api/routers/rounds.py`** — add two routes:

```
POST /api/rounds/{id}/share    → sets shared_at = NOW() on the authenticated user's round
DELETE /api/rounds/{id}/share  → sets shared_at = NULL (unshare)
```

Both require `current_user.id == round.user_id` (same 403 guard pattern used elsewhere).

**`api/routers/users.py` (or new `social.py`)** — add feed route:

```
GET /api/social/feed?limit=20&before=<timestamp>
```

Query: select rounds where `shared_at IS NOT NULL` from users who have an `accepted` friendship with the caller. Return `RoundSummaryResponse` plus author name and avatar-placeholder fields.

**New file:** `api/routers/social.py` with a `router` registered in `api/main.py` under `/api/social`.

**`database/repositories/round_repo.py`** — add:
- `share_round(round_id, user_id)` / `unshare_round(round_id, user_id)` (UPDATE with owner check)
- `get_friend_feed(user_id, limit, before)` — parameterized JOIN friends → rounds

### 3. Frontend

**`frontend/src/lib/api.ts`** — add:

```ts
shareRound(roundId: string): Promise<void>
unshareRound(roundId: string): Promise<void>
getFriendFeed(params?: { limit?: number; before?: string }): Promise<FeedRound[]>
```

**`frontend/src/pages/RoundDetailPage.tsx`** — add a **Share / Unshared** toggle button in the round header action bar. When `shared_at` is set, show "Shared ✓" with option to unshare.

**`frontend/src/pages/SocialPage.tsx`** — replace the current empty bottom section with a `<FriendFeed />` component. Each feed item renders `<ShareCard round={...} courseName={...} />` in a card wrapper with author name, date, and score badge.

**New file:** `frontend/src/components/social/FriendFeed.tsx` — infinite-scroll list (or simple paginated list) of `FeedRoundCard` items. Uses `useInfiniteQuery` with `getFriendFeed` and cursor-based pagination via `before` param.

**New file:** `frontend/src/components/social/FeedRoundCard.tsx` — wraps `ShareCard` with author header (name, date) and a "View Round" link.

**`frontend/src/types/analytics.ts` or `frontend/src/types/social.ts`** — add `FeedRound` type.

### 4. Auth/privacy guard

Shared rounds from blocked users must not appear. The friendships table `status IN ('accepted')` filter handles this at the query level — blocked/declined friendships are excluded automatically.

---

## Estimated Complexity

**Medium** — the DB change is trivial (one column), the query logic is straightforward, and the ShareCard display component already exists. Main work is wiring the feed query and adding the share toggle to the detail page. Total estimate: ~4–6 hours of focused implementation.

---

## Acceptance Criteria

- [ ] A golfer can tap "Share Round" on any round detail page; the round appears in friends' Social feeds within one page refresh.
- [ ] A golfer can unshare a round from the same detail page toggle; it disappears from friends' feeds.
- [ ] The Social page feed shows shared rounds from all accepted friends, ordered newest-shared first, each rendered with the existing `ShareCard` visual.
- [ ] Rounds from users who are not accepted friends (pending, declined, blocked) never appear in the feed.
- [ ] The share/unshare action is protected: attempting to share another user's round returns 403.
