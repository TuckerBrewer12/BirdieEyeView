# Daily Feature Plan — 2026-11-02

## Feature: Friend Activity Feed

**One-line description:** Show friends' recent rounds on the Social page so golfers have a daily reason to open the app and a competitive pulse on their group.

---

## User Value

Golf is inherently social. You want to know if your buddy shot a 79 last weekend — not because you can look it up somewhere, but because it shows up. Right now the Social page shows a friend's name and email: that's it. The friendship graph is fully built (friend codes, accepted/pending/declined statuses, friend analytics in The Lab), but the Social page is a dead end. A feed of recent rounds closes that loop: you see a friend's course, score, and score breakdown, feel the competitive sting, and come back after your next round to post yours. This is the difference between an app you check once a week and one you check daily.

---

## Technical Approach

### 1. Database Migration — `013_add_round_visibility.sql`

```sql
ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'friends'
    CHECK (visibility IN ('public', 'friends', 'private'));
```

Existing rounds default to `'friends'` (visible to accepted friends). Users can optionally mark a round `'private'` when saving.

---

### 2. Backend — New Social Feed Endpoint

**New file:** `api/routers/social.py`

```
GET /api/social/feed?limit=20&offset=0
```

- Authenticated endpoint (requires `current_user` via `Depends(get_current_user)`)
- Queries accepted friendships for `current_user.id` (both as requester and addressee)
- Joins with `users.rounds` WHERE `visibility IN ('public', 'friends')` AND `round.user_id IN (friend_ids)`
- Returns rounds sorted by `round_date DESC`
- Response shape per item:
  ```json
  {
    "friend_id": "uuid",
    "friend_name": "Tucker Brewer",
    "round_id": "uuid",
    "course_name": "Pebble Beach",
    "date": "2026-10-28",
    "total_score": 82,
    "to_par": 10,
    "score_type_counts": { "birdie": 2, "par": 7, "bogey": 8, "double_bogey": 1 },
    "tee_box": "White",
    "holes_played": 18
  }
  ```
- Max 50 results per request; no cross-schema data leaks (only visibility-gated fields)

**Wire up in `api/main.py`:** `app.include_router(social_router, prefix="/api/social", tags=["social"])`

**DB query helper:** Add `get_friend_feed(user_id, limit, offset)` to `database/repositories/round_repo.py` using a single JOIN query across `users.friendships` and `users.rounds`.

---

### 3. Frontend — API Client

**File:** `frontend/src/lib/api.ts`

Add method:
```ts
getSocialFeed: (limit = 20, offset = 0): Promise<FriendRoundItem[]>
```

**New type in** `frontend/src/types/golf.ts`:
```ts
export interface FriendRoundItem {
  friend_id: string;
  friend_name: string;
  round_id: string;
  course_name: string | null;
  date: string | null;
  total_score: number | null;
  to_par: number | null;
  score_type_counts: Record<string, number>;
  tee_box: string | null;
  holes_played: number;
}
```

---

### 4. Frontend — FriendRoundCard Component

**New file:** `frontend/src/components/social/FriendRoundCard.tsx`

Renders a single friend's round as a compact card following the design system:
- `bg-white rounded-2xl border border-gray-100 shadow-sm`
- Header row: friend avatar initials chip + name + date
- Score hero: total score large, to-par colored (green/red/gray per sign)
- Course name + tee
- Score-type pill row: birdies (emerald), pars (gray), bogeys (red), doubles (blue) — use the semantic palette from the design system
- Tap → navigates to `/rounds/{round_id}` (read-only view is fine since it's another user's round)

---

### 5. Frontend — Social Page Update

**File:** `frontend/src/pages/SocialPage.tsx`

- Add `useQuery` for `api.getSocialFeed()` keyed as `["social-feed"]`
- Add a new section below "Friends List":
  ```
  Friends Activity
  [FriendRoundCard × N]
  [Load more button / infinite scroll]
  ```
- Empty state: "No recent activity from friends. Add friends to see their rounds here."
- Loading skeleton: 3 placeholder cards

---

### 6. Frontend — Private Round Toggle on Save

**File:** `frontend/src/components/scan/ScanReviewStep.tsx`

Add a small toggle above the Save button:
```
🔒 Keep private   [toggle off by default → visible to friends]
```

Pass `visibility: 'private' | 'friends'` in the save payload to `POST /api/scan/save`.

**File:** `frontend/src/hooks/useScan.ts` — add `visibility` field to scan state, default `'friends'`.

**File:** `api/routers/scan.py` — accept optional `visibility` field in `SaveScanRequest`, pass to round creation.

---

### Files to Change

| File | Change |
|---|---|
| `database/migrations/013_add_round_visibility.sql` | New migration |
| `database/schema.sql` | Add `visibility` column to `users.rounds` |
| `database/repositories/round_repo.py` | Add `get_friend_feed()` query |
| `api/routers/social.py` | New router with `GET /feed` |
| `api/main.py` | Register social router |
| `api/routers/scan.py` | Accept `visibility` in save payload |
| `frontend/src/lib/api.ts` | Add `getSocialFeed()` |
| `frontend/src/types/golf.ts` | Add `FriendRoundItem` type |
| `frontend/src/components/social/FriendRoundCard.tsx` | New component |
| `frontend/src/pages/SocialPage.tsx` | Add feed section |
| `frontend/src/components/scan/ScanReviewStep.tsx` | Add privacy toggle |

---

## Estimated Complexity

**Medium** — roughly 2–3 focused days.

- DB migration: trivial (30 min)
- Backend endpoint + repo query: small (3–4 hrs) — one JOIN query, no new tables
- Frontend API + types: small (1 hr)
- FriendRoundCard component: small–medium (2–3 hrs) — design-system conformant
- Social page integration: small (1–2 hrs)
- Privacy toggle on save: small (1 hr)

No new infra, no external APIs, no schema redesign. All data already exists.

---

## Acceptance Criteria

- [ ] The Social page renders a "Friends Activity" section showing the 20 most recent rounds from accepted friends, sorted newest-first
- [ ] Each friend round card displays: friend name, course name, date, total score, to-par (color-coded), and score-type breakdown chips (birdies/pars/bogeys/doubles)
- [ ] Only rounds with `visibility = 'friends'` or `'public'` are returned; rounds marked `'private'` are excluded
- [ ] Existing rounds default to `visibility = 'friends'` (migration backfills the column default — no data loss)
- [ ] When saving a scan/manual round, a "Keep private" toggle lets the user set `visibility = 'private'` before saving
- [ ] The feed endpoint requires authentication and only returns rounds from the authenticated user's accepted friends (no cross-user data leaks)
