# Daily Feature Plan — 2026-10-24

## Feature: Friends Activity Feed

**One-line description:** Show a scrollable feed of friends' recent rounds so golfers can celebrate, compete, and stay connected.

---

## User Value

Right now the social graph is invisible. Users can add friends via friend code and accept/decline requests, but after that the friendship produces zero value — there is no shared experience. A golfer who adds three friends has no reason to open the app between scans.

A feed changes this. Every time a friend scans a round, it appears in your feed as a familiar scorecard card (the `ShareCard` visual is already built). You see their score, course, date, and score-type breakdown at a glance. This creates:

- **Motivation to scan more:** your round shows up on friends' feeds, which drives engagement.
- **Social accountability:** you can see if your buddy broke 90 before you.
- **A reason to open the app every day**, even without scanning.

---

## Technical Approach

### 1. Backend — new endpoint (no new DB table required)

Friends and rounds are already in the DB. The feed is just a join across the existing schema.

**New file:** `api/routers/feed.py`

```sql
-- Conceptual query (execute via asyncpg in round_repo or a new feed_repo)
SELECT
    r.id, r.date, r.total_score, r.tee_box, r.course_name_played,
    r.course_id, c.name AS course_name,
    u.id AS user_id, u.display_name, u.friend_code,
    COUNT(hs.id) AS hole_count
FROM users.friendships f
JOIN users.users u
    ON (f.requester_id = :viewer_id AND u.id = f.addressee_id)
    OR (f.addressee_id = :viewer_id AND u.id = f.requester_id)
JOIN users.rounds r ON r.user_id = u.id
LEFT JOIN courses.courses c ON c.id = r.course_id
LEFT JOIN users.hole_scores hs ON hs.round_id = r.id
WHERE f.status = 'accepted'
  AND r.date >= NOW() - INTERVAL '90 days'
GROUP BY r.id, u.id, c.name
ORDER BY r.date DESC
LIMIT :limit OFFSET :offset;
```

**New route:** `GET /api/feed?limit=20&offset=0` (auth required, scoped to `current_user`)

**Register in** `api/main.py`: `app.include_router(feed.router, prefix="/api/feed", tags=["feed"])`

**New file:** `database/repositories/feed_repo.py`
- `get_friend_activity(viewer_id, limit, offset) → list[FeedItem]`

**New schema:** `api/schemas.py` — add `FeedItem` (round summary + author fields) and `FeedResponse` (items + has_more).

### 2. Frontend — feed page + feed card component

**New component:** `frontend/src/components/feed/FeedRoundCard.tsx`
- Reuses `ShareCard` visual language: score badge, course name, date, score-type chips
- Adds author row at top (display name + avatar initial)
- Compact: 1-column list, card height ~140px
- Tapping the card navigates to `/rounds/:id` (read-only view for friend's rounds — needs a public-read guard in the round detail page)

**New page:** `frontend/src/pages/FeedPage.tsx`
- Header: "Activity" with a refresh icon
- `useInfiniteQuery` against `/api/feed` (pagination via offset)
- Empty state: "Add friends to see their rounds" → link to `/social`
- Loading state: 3 skeleton cards

**Add route in** `frontend/src/App.tsx`:
```tsx
<Route path="/feed" element={<FeedPage userId={userId} />} />
```

**Add nav item in** `frontend/src/components/layout/Sidebar.tsx` and `BottomNav.tsx`:
- Icon: `UsersRound` (Lucide)
- Label: "Feed"
- Badge: unread count (can be a simple "new since last visit" localStorage timestamp)

**New hook:** `frontend/src/lib/api.ts` — add `getFeed(limit, offset)` method.

### 3. Read-only friend round view

`RoundDetailPage` currently assumes the viewer is the owner. Add a guard:
- If `round.user_id !== currentUserId`, hide edit controls and show a "Viewing [Name]'s round" banner.
- The existing scorecard grid + story components already render correctly for any round.

**File:** `frontend/src/pages/RoundDetailPage.tsx` — add `isOwner` prop/flag.

### 4. No new DB migration required

All data is already captured. The feed query is a read-only join over `friendships`, `rounds`, `hole_scores`, and `courses`. Nothing new to store.

---

## Estimated Complexity

**Medium** — approximately 2–3 days of focused work.

- Backend: 1 new repo method + 1 new router + schema additions (~150 LOC)
- Frontend: 1 feed card component + 1 page + nav wiring + read-only guard (~350 LOC)
- No DB migration needed
- No new external dependencies

---

## Acceptance Criteria

- [ ] Authenticated user hits `GET /api/feed` and receives a list of accepted friends' recent rounds (last 90 days), paginated, newest first.
- [ ] The Feed page renders each round as a card showing: friend's name, course name, total score, to-par, date, and score-type chips (eagle/birdie/par/bogey counts).
- [ ] "Feed" navigation item appears in the bottom nav (mobile) and sidebar (desktop) and routes to the feed page.
- [ ] Viewing a friend's round via the feed card opens the round detail page in read-only mode (no edit controls visible).
- [ ] Empty state with a link to the Social page appears when the user has no accepted friends or no friends have scanned in the past 90 days.
