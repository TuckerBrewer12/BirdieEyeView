# Daily Feature Plan — 2026-10-20

## Feature: Friend Activity Feed

**One-line description:** Show accepted friends' recent rounds in a live social feed on the Social page.

---

## User Value

Right now, friendships in the app are inert — you can add friends, accept requests, and see them listed, but nothing happens after that. A golfer with three friends using the app has no way to see that one of them just shot a 78 at Torrey Pines.

The Activity Feed closes this loop. After adding friends, the Social page becomes a living feed of recent rounds: score, course, date, score type breakdown. Golfers are naturally competitive and curious about their playing partners' games. This turns a passive contacts list into a reason to open the app every day.

---

## Technical Approach

### Backend — new endpoint

**New file:** `api/routers/social.py`

```
GET /api/social/{user_id}/feed?limit=20&offset=0
```

- Auth: `get_current_user`; only the authenticated user may request their own feed
- Logic:
  1. Query `users.friendships` for all `accepted` pairs involving `user_id`
  2. Collect the set of friend user IDs
  3. Query `users.rounds` WHERE `user_id IN (friend_ids)` ORDER BY `round_date DESC` LIMIT/OFFSET
  4. For each round, join `users.hole_scores` and `courses.courses` (left join — course may be null)
  5. Return a `FeedItem` response: `round_id`, `user_id`, `friend_name`, `course_name`, `round_date`, `total_score`, `to_par`, `score_type_counts` (eagle/birdie/par/bogey/double/triple+)

No new DB migrations needed — all data is already in existing tables.

**Response schema (add to `api/schemas.py`):**

```python
class FeedScoreTypeCounts(BaseModel):
    eagle_or_better: int
    birdie: int
    par: int
    bogey: int
    double: int
    triple_or_worse: int

class FeedItem(BaseModel):
    round_id: str
    user_id: str
    friend_name: str
    course_name: Optional[str]
    round_date: Optional[date]
    total_score: Optional[int]
    to_par: Optional[int]
    score_type_counts: FeedScoreTypeCounts

class FeedResponse(BaseModel):
    items: list[FeedItem]
    total: int
```

**Register router in `api/main.py`:**
```python
from api.routers import social
app.include_router(social.router, prefix="/api/social", tags=["social"])
```

### Frontend — update SocialPage + add feed UI

**`src/lib/api.ts`** — add:
```ts
getFeed(userId: string, limit = 20, offset = 0): Promise<FeedResponse>
```

**`src/types/golf.ts`** (or a new `src/types/social.ts`) — add `FeedItem` and `FeedResponse` types.

**`src/components/social/FeedCard.tsx`** — new component:
- Shows friend name, course name, date, total score with to-par, and a compact score-type dot row (reuse the color palette from `ShareCard.tsx`)
- Tailwind card matching the existing `bg-white rounded-2xl border border-gray-100 shadow-sm` design system

**`src/pages/SocialPage.tsx`** — add a "Recent Rounds" section below the friend list:
- `useQuery(["feed", userId], () => api.getFeed(userId))` — React Query
- Renders `FeedCard` list; empty state: "Your friends haven't posted any rounds yet."
- Show only when `friends.length > 0`

### Files to change / create

| File | Change |
|---|---|
| `api/routers/social.py` | NEW — feed endpoint |
| `api/main.py` | Register new router |
| `api/schemas.py` | Add `FeedItem`, `FeedResponse`, `FeedScoreTypeCounts` |
| `database/repositories/round_repo.py` | Add `get_rounds_for_users(user_ids, limit, offset)` |
| `src/lib/api.ts` | Add `getFeed()` |
| `src/types/social.ts` | NEW — TS types |
| `src/components/social/FeedCard.tsx` | NEW — feed card component |
| `src/pages/SocialPage.tsx` | Add feed section |

### DB migrations needed

None — all required data (friendships, rounds, hole_scores, courses) already exists.

---

## Estimated Complexity

**Medium** — 4-6 hours of focused work. The data is all there; this is plumbing + a new UI surface. The main judgment call is what level of round detail to expose (full scorecard vs. summary card); a summary card is the right MVP scope.

---

## Acceptance Criteria

- [ ] Authenticated user can GET `/api/social/{user_id}/feed` and receive a list of recent rounds from accepted friends, ordered by `round_date` descending.
- [ ] Feed returns 403 if `current_user.id != user_id` in path.
- [ ] Social page shows a "Recent Rounds" section when the user has at least one accepted friend, populated from the feed endpoint.
- [ ] Each feed card displays: friend name, course name (or "Unknown course"), date, total score, to-par, and a score-type dot row.
- [ ] Empty state ("No rounds from friends yet") renders correctly when friends have no saved rounds.

---

*Generated 2026-10-20*
