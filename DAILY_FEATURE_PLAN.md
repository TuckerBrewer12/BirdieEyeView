# Daily Feature Plan — 2026-09-07

## Feature: Friend Activity Feed

**One-line description:** A live feed showing recent rounds posted by accepted friends, turning the dormant social graph into a daily-driver reason to open the app.

---

## User Value

Friendships are fully modeled in the DB and the add-friends / inbox UI is shipped, but friends can't see each other's activity — making the social layer completely inert. A golfer who adds their regular playing partners expects to see how they're doing between rounds. Right now that expectation goes unmet and the social tab has nothing to show after the initial add. A friend feed:

- Gives users a reason to open the app on non-playing days
- Creates social accountability (seeing a friend post a round prompts your own)
- Surfaces the stats and analytics pages to new users who click into a friend's round
- Completes the natural "post-scan" loop: scan → save → friends see it instantly

---

## Technical Approach

### Backend

**New endpoint: `GET /api/social/feed`**

File: `api/routers/social.py` (new file, ~80 lines)

```
GET /api/social/feed?user_id={id}&limit=20&offset=0
```

Response shape:
```json
[
  {
    "round_id": 42,
    "user_id": 7,
    "display_name": "Alex R.",
    "avatar_initials": "AR",
    "course_name": "Pebble Beach",
    "played_at": "2026-09-06",
    "total_score": 84,
    "total_to_par": +12,
    "score_differential": 11.4,
    "num_birdies": 2,
    "num_pars": 9
  }
]
```

SQL (no schema migration needed — all data already exists):

```sql
SELECT
  r.id AS round_id,
  r.user_id,
  u.display_name,
  r.course_name_played AS course_name,
  r.played_at,
  r.total_score,
  r.score_differential,
  (SELECT COUNT(*) FROM users.hole_scores hs
   WHERE hs.round_id = r.id AND hs.strokes - hs.par_played = -1) AS num_birdies,
  (SELECT COUNT(*) FROM users.hole_scores hs
   WHERE hs.round_id = r.id AND hs.strokes - hs.par_played = 0)  AS num_pars
FROM users.rounds r
JOIN users.users u ON u.id = r.user_id
JOIN users.friendships f ON (
  (f.user_id = :viewer_id AND f.friend_id = r.user_id) OR
  (f.friend_id = :viewer_id AND f.user_id = r.user_id)
)
WHERE f.status = 'accepted'
  AND r.is_complete = TRUE
ORDER BY r.played_at DESC, r.id DESC
LIMIT :limit OFFSET :offset;
```

**Files to change:**
- `api/routers/social.py` — new router with `/feed` and `/feed/{round_id}` (deep link)
- `api/main.py` — register new router (`app.include_router(social.router)`)
- `database/repositories/round_repo.py` — add `get_friend_feed(viewer_id, limit, offset)` method
- `api/request_models.py` — add `FeedItem` response model

### Frontend

**New component: `FeedPage.tsx`** (`src/pages/FeedPage.tsx`, ~180 lines)

- Listed in `App.tsx` as `/feed` route (add to nav sidebar)
- Fetches `GET /api/social/feed?user_id={currentUser.id}`
- Renders a vertical list of `FeedCard` components

**New component: `FeedCard.tsx`** (`src/components/social/FeedCard.tsx`, ~80 lines)

Displays per round:
- User avatar initials pill + display name + date (`played_at`)
- Course name (bold) + score to par badge (color-coded per design system)
- Birdie count + par count summary line
- `→ View Round` link to `/rounds/{round_id}` (RoundDetailPage already exists)
- Skeleton placeholder while loading

**Files to change:**
- `src/App.tsx` — add `/feed` route
- `src/lib/api.ts` — add `getFriendFeed(userId, limit?, offset?)` API helper
- `src/components/layout/Sidebar.tsx` (or equivalent nav) — add "Feed" nav item with activity-bell icon
- `src/pages/FeedPage.tsx` — new page
- `src/components/social/FeedCard.tsx` — new component

**API client addition (`src/lib/api.ts`):**
```ts
export async function getFriendFeed(userId: number, limit = 20, offset = 0): Promise<FeedItem[]> {
  const r = await fetch(`/api/social/feed?user_id=${userId}&limit=${limit}&offset=${offset}`);
  if (!r.ok) throw new Error('Failed to load feed');
  return r.json();
}
```

### No DB Migration Required

All necessary data is already present:
- `users.friendships` — accepted status, bidirectional pairs
- `users.rounds` — `is_complete`, `played_at`, `total_score`, `course_name_played`, `score_differential`
- `users.hole_scores` — `strokes`, `par_played` (for birdie/par counting)
- `users.users` — `display_name`

---

## Estimated Complexity

**Medium** (~1 focused day of work)

- Backend: ~2 hours (new router + repo method + tests)
- Frontend: ~4 hours (FeedPage + FeedCard + API wiring + nav entry)
- No schema migration, no new dependencies

---

## Acceptance Criteria

- [ ] A user with at least one accepted friend sees those friends' completed rounds on `/feed`, ordered newest-first
- [ ] Each feed card shows: friend display name, course name, total score to par (color-coded), birdie count, and date played
- [ ] Clicking "View Round" opens `RoundDetailPage` for that round (read-only — no edit controls for other users' rounds)
- [ ] A user with zero accepted friends sees a friendly empty state: "Add friends to see their rounds here" with a link to `/social`
- [ ] The feed endpoint is paginated (`limit`/`offset`) and the page loads a second batch on scroll or "Load more" tap
