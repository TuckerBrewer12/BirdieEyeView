# Daily Feature Plan — 2026-09-29

## Feature: Friends Activity Feed

**One-line description:** A live feed on the Social page showing recent rounds posted by friends, with score breakdowns and a quick reaction.

---

## User Value

Right now the social infrastructure is half-built: users can add friends via friend codes, accept requests through the Inbox, and generate a shareable SVG scorecard — but there is no way to *see* what your friends shot. The friends list is a dead end.

A golfer who just played a round wants to share it with their group and see how everyone else did. Without a feed, the social graph has no payoff. Adding an activity feed turns the existing friend network into a daily engagement loop: scan a round → share it → see your friends react → come back tomorrow.

---

## Technical Approach

### Database (1 migration)

**New file:** `database/migrations/013_add_activity_feed.sql`

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS users.round_shares (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    round_id     UUID NOT NULL REFERENCES users.rounds(id) ON DELETE CASCADE,
    message      VARCHAR(280),
    shared_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, round_id)
);

CREATE INDEX IF NOT EXISTS idx_round_shares_user_id   ON users.round_shares (user_id);
CREATE INDEX IF NOT EXISTS idx_round_shares_shared_at ON users.round_shares (shared_at DESC);

CREATE TABLE IF NOT EXISTS users.feed_reactions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id   UUID NOT NULL REFERENCES users.round_shares(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    emoji      VARCHAR(8) NOT NULL DEFAULT '👍',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (share_id, user_id)
);

COMMIT;
```

### Backend

**New file:** `api/routers/feed.py`

Endpoints:
- `POST /api/feed/share` — share a round (body: `{round_id, message?}`); 401 if not owner of round
- `DELETE /api/feed/shares/{share_id}` — unshare; 403 if not owner
- `GET /api/feed/{user_id}` — paginated activity feed of friends' shares (query: `?limit=20&before=<ISO timestamp>`); joins `round_shares` → `rounds` → users via `friendships WHERE status='accepted'`
- `POST /api/feed/shares/{share_id}/react` — upsert reaction (body: `{emoji}`); allowed emojis: 👍🔥💪😤
- `DELETE /api/feed/shares/{share_id}/react` — remove own reaction

**New repository:** `database/repositories/feed_repo.py`

Key query for the feed (friends-only, paginated):
```sql
SELECT rs.*, u.display_name, r.total_score, r.course_name_played, r.round_date, ...
FROM users.round_shares rs
JOIN users.users u ON u.id = rs.user_id
JOIN users.rounds r ON r.id = rs.round_id
WHERE rs.user_id IN (
  SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
  FROM users.friendships
  WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
)
AND rs.shared_at < $2
ORDER BY rs.shared_at DESC
LIMIT $3
```

**Wire up in** `api/main.py`: `app.include_router(feed.router, prefix="/api/feed")`

### Frontend

**New component:** `frontend/src/components/social/FeedItem.tsx`

Renders one feed entry: friend's name + avatar initial, course name, score + to-par badge, date, optional message, reaction row (4 emoji options). Reuses the existing `ShareCard` SVG scorecard for an optional expand view.

**New hook:** `frontend/src/hooks/useFeedViewModel.ts`

Wraps `useInfiniteQuery` for `GET /api/feed/{user_id}` with `before` cursor pagination. Exposes `items`, `loadMore`, `hasMore`, `shareRound(roundId, message)`.

**Modify:** `frontend/src/pages/SocialPage.tsx`

Add a "Feed" tab alongside the existing "Add Friend" section. When a friend is selected from the friends list, optionally show their shared rounds. The main feed tab shows the chronological river of friends' activity.

**Add share button to:** `frontend/src/pages/RoundDetailPage.tsx`

A "Share to Feed" button (using the existing share icon) that calls `POST /api/feed/share`. Toggles to "Unshare" if already shared.

**Update API client:** `frontend/src/lib/api.ts`

Add `getFeed`, `shareRound`, `unshareRound`, `reactToShare`, `removeReaction`.

---

## Estimated Complexity

**Medium** — ~2–3 days of focused work.

- 1 migration (straightforward schema)
- 1 new API router (~150 lines) + 1 new repository (~80 lines)
- 2 new frontend components (~200 lines total)
- Modifications to 3 existing files (SocialPage, RoundDetailPage, api.ts)
- No external dependencies; reuses existing auth + friendship logic

---

## Acceptance Criteria

- [ ] A user can tap "Share" on any of their rounds and have it appear in their friends' feeds within seconds
- [ ] The feed on the Social page shows the last 20 shared rounds from accepted friends, newest first, with infinite scroll
- [ ] Each feed item displays: friend's name, course name, total score + to-par, round date, and an optional short message
- [ ] A user can react to a friend's shared round with one of four emoji (👍🔥💪😤); only one reaction per user per share
- [ ] Sharing/unsharing is idempotent — double-tapping "Share" on an already-shared round shows "Unshare" and removes it cleanly from all feeds
