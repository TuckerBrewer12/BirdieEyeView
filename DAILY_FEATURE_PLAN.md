# Daily Feature Plan — 2026-10-11

## Feature: Friend Activity Feed

**One-line description:** Show accepted friends' recent rounds in a scrollable feed on the Social page, turning the dormant friend graph into something golfers actually use.

---

## User Value

Golfers talk about their rounds constantly — "I shot an 82 at Pebble yesterday." Right now the app has a fully wired friends system (add by friend code, accept requests, inbox) but after you accept a friend, nothing happens. There is no payoff. This feature closes that loop: open the Social page and see your friends' recent rounds at a glance, with score, course, and the traditional scorecard scoring symbols already built in `ShareCard`. Competing with friends is one of the primary reasons people track scores at all.

---

## Technical Approach

### Backend — 1 new endpoint

**File:** `api/routers/users.py` (or a new `api/routers/social.py`)

Add:
```
GET /api/users/me/feed?limit=20&offset=0
```

Logic:
1. From `current_user.id`, query `users.friendships` for all rows where `(requester_id = me OR addressee_id = me) AND status = 'accepted'` to get friend IDs.
2. Query `users.rounds` for those friend IDs ordered by `played_at DESC`, with `LIMIT`/`OFFSET`.
3. Return lightweight round summaries: `round_id`, `user_id`, `display_name`, `total_score`, `course_name_played`, `played_at`, `hole_count`, `to_par`.

**No new migration needed** — all required columns exist.

### Frontend — Feed component + API wiring

**New file:** `frontend/src/components/social/FriendFeedItem.tsx`
- Renders a single round card: avatar initials, player name, course name, score, to-par badge, date.
- Reuses score-type color tokens from `CLAUDE.md` design system.
- `ShareCard` ref pattern (already in `RoundDetailPage`) can render per-hole symbols if expanded.

**Edit:** `frontend/src/pages/SocialPage.tsx`
- Add a "Recent Activity" section below the Friends List section.
- `useQuery` key `["friend-feed"]` calling new `api.getFriendFeed()`.
- Empty state: "No activity yet — add friends to see their rounds here."

**Edit:** `frontend/src/lib/api.ts`
- Add `getFriendFeed(limit?: number): Promise<FriendFeedItem[]>`

**New type:** `frontend/src/types/social.ts`
```ts
export interface FriendFeedItem {
  round_id: string;
  user_id: string;
  display_name: string;
  total_score: number | null;
  course_name_played: string | null;
  played_at: string;
  hole_count: number;
  to_par: number | null;
}
```

### Auth / security
- Endpoint uses existing `get_current_user` dependency — friends can only see each other's totals (no hole-by-hole breakdown in the feed without an explicit click).
- Rate-limit via the existing `SlidingWindowRateLimiter` pattern if feed queries become expensive.

---

## Estimated Complexity

**Medium** — backend is a two-table JOIN that returns existing data; frontend is a new list component reusing the design system. No schema migration. Estimated 4–6 hours of focused work.

---

## Acceptance Criteria

- [ ] A user with at least one accepted friend sees those friends' rounds listed under "Recent Activity" on `/social`, sorted newest-first.
- [ ] Each feed item shows: player name, course name, total score with to-par delta (e.g. "+4"), and relative date (e.g. "2 days ago").
- [ ] A user with no accepted friends sees a friendly empty-state message, not a blank section.
- [ ] The endpoint returns only rounds from `accepted` friendships — not pending, declined, or blocked.
- [ ] Requesting the feed for a user you are not authenticated as returns 403.
