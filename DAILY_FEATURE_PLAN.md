# Daily Feature Plan — 2026-09-18

## Feature: Friends Activity Feed

**One-line description:** A live social feed on the Social page that surfaces friends' recent rounds with scores, courses, and key stats.

---

## User Value

Every golfer wants to know what their buddies shot. Right now the app has a full friendship system (friend codes, requests, accepted/pending states) but once you add a friend there is nothing to see — no activity, no scores, no bragging rights. This feature closes that loop.

A daily-check destination changes the usage pattern from "open to log a round" to "open to see what's happening." That lift in DAU directly improves retention and drives word-of-mouth: when a friend posts a great round, others want to sign up to see more and to log their own.

The data is already there (rounds, hole_scores, courses). This feature is about connecting the dots and rendering them.

---

## Technical Approach

### Backend — new endpoint

**New file:** `api/routers/social.py`

```
GET /api/social/feed/{user_id}?limit=20&offset=0
```

Returns a paginated list of recent rounds posted by the requesting user's accepted friends. Each item includes:
- `round_id`, `round_date`, `total_score`, `course_name_played`
- `holes_played`, `tee_box_played`
- Friend name + friend user_id (for linking to their profile)
- Optional: `score_to_par` (computed from `par_played` sums)

**New DB query in `database/repositories/round_repo.py`:**

```sql
SELECT
  r.id, r.round_date, r.total_score, r.course_name_played,
  r.holes_played, r.tee_box_played, r.course_id,
  u.id AS friend_user_id, u.name AS friend_name,
  c.name AS linked_course_name,
  COALESCE(SUM(hs.par_played), 0) AS total_par
FROM users.rounds r
JOIN users.users u ON u.id = r.user_id
LEFT JOIN courses.courses c ON c.id = r.course_id
LEFT JOIN users.hole_scores hs ON hs.round_id = r.id
WHERE r.user_id IN (
  SELECT CASE
    WHEN requester_id = $1 THEN addressee_id
    ELSE requester_id
  END
  FROM users.friendships
  WHERE (requester_id = $1 OR addressee_id = $1)
    AND status = 'accepted'
)
GROUP BY r.id, u.id, c.name
ORDER BY r.round_date DESC
LIMIT $2 OFFSET $3
```

Add `get_friends_feed(user_id, limit, offset)` to `RoundRepository`.

**Register router in `api/main.py`:** add `social_router` under `/api/social`.

**Auth:** require `current_user.id == user_id` (friends' rounds are only visible to their friends — not public).

### Frontend — update SocialPage + new component

**Update `frontend/src/pages/SocialPage.tsx`:**
- Add `useQuery` fetching `GET /api/social/feed/{userId}`
- Render feed below the friends list, separated by a section label "Recent Activity"
- Empty state: "Add friends to see their rounds here."
- Infinite scroll or "Load more" button (offset-based pagination)

**New file:** `frontend/src/components/social/ActivityFeedItem.tsx`

Each feed item shows:
- Avatar initial + friend name
- Course name (linked to `/courses/{course_id}` if known)
- Round date (relative: "2 days ago")
- Score + to-par badge (green for under par, red for over, gray for even)
- Holes played pill if not 18 holes
- Tap/click navigates to the round detail page (only if friend's round is accessible — otherwise just shows summary)

**New API function in `frontend/src/lib/api.ts`:**
```ts
getFriendsFeed(userId: string, limit = 20, offset = 0): Promise<FeedItem[]>
```

**New types in `frontend/src/types/social.ts`:**
```ts
interface FeedItem {
  round_id: string;
  round_date: string;
  total_score: number | null;
  course_name: string | null;
  holes_played: number | null;
  tee_box_played: string | null;
  total_par: number | null;
  friend_user_id: string;
  friend_name: string;
}
```

### DB Migration

**None required.** All necessary data lives in existing tables (`users.rounds`, `users.hole_scores`, `users.friendships`, `users.users`, `courses.courses`).

---

## Files to Change / Add

| Action | Path |
|--------|------|
| Create | `api/routers/social.py` |
| Edit   | `api/main.py` — register social router |
| Edit   | `database/repositories/round_repo.py` — add `get_friends_feed` |
| Edit   | `database/converters.py` — add `feed_row_to_dict` helper if needed |
| Edit   | `frontend/src/lib/api.ts` — add `getFriendsFeed` |
| Create | `frontend/src/types/social.ts` |
| Create | `frontend/src/components/social/ActivityFeedItem.tsx` |
| Edit   | `frontend/src/pages/SocialPage.tsx` — render feed section |

---

## Estimated Complexity

**Medium** (~3–4 days of focused work)

- SQL join across 4 tables is straightforward; no schema changes
- Frontend component is self-contained; fits the existing design system
- Auth + privacy guardrails need care (only accepted friends, user's own feed)
- No new infrastructure; no migrations

---

## Acceptance Criteria

- [ ] `GET /api/social/feed/{user_id}` returns an ordered list of accepted friends' rounds, newest first, paginated by `limit`/`offset`
- [ ] Requesting the feed for a `user_id` other than the authenticated user returns 403
- [ ] Social page shows a "Recent Activity" section below the friends list, populated with feed items; each item shows friend name, course, date, and score
- [ ] An empty state is shown when the user has no accepted friends or no friends have logged rounds
- [ ] Feed items follow the existing design system (card styling, score-type color, relative dates) and are responsive on mobile
