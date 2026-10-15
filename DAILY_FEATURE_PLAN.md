# Daily Feature Plan — 2026-10-15

## Feature: Friends Activity Feed & Round Leaderboard

**One-line description:** Show a live feed of friends' recent rounds and a head-to-head score leaderboard on the Social page, turning the already-built friend graph into an active social loop.

---

## User Value

Golfers are inherently competitive. The app already lets users add friends and accept friend requests, but there is currently nothing to *do* with those connections — no way to see what your buddies shot last weekend, no bragging rights, no pressure to post rounds. This feature closes that loop:

- **See friends' recent rounds** without asking them to screenshot — it appears automatically once they save a round.
- **Leaderboard widget** showing scoring average and recent best round ranked across your friend group, driving friendly competition and repeat opens.
- **Round-by-round comparison** (compare your round at the same course to a friend's round there) surfaces naturally from the feed.

This is the standard engagement loop that keeps golf apps sticky (Arccos, 18Birdies, Golfshot all anchor retention here).

---

## Technical Approach

### Backend

**New endpoint: `GET /api/users/me/friends/activity`**

File: `api/routers/users.py`

Returns the 20 most recent rounds from accepted friends, with enough detail to render a feed row (round id, date, course name, total score, to-par, user name).

```python
@router.get("/me/friends/activity")
async def get_friends_activity(
    limit: int = Query(default=20, le=50),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
```

Implementation: query `users.friendships` for accepted rows involving `current_user.id`, collect friend UUIDs, then query `users.rounds` joined with `courses.courses` ordered by `date_played DESC` with a LIMIT. Return a list of `FriendRoundRow` response models.

**New endpoint: `GET /api/users/me/friends/leaderboard`**

File: `api/routers/users.py`

Returns per-friend aggregate stats (rounds played, scoring average last 10, best round score, best round id) for the leaderboard widget. Computes from `users.rounds` rows.

**New repository method: `round_repo.get_recent_rounds_for_users(user_ids, limit)`**

File: `database/repositories/round_repo.py`

Single async query using `WHERE user_id = ANY($1::uuid[])` — avoids N+1 fetches.

**New response models**

File: `api/request_models.py`

```python
class FriendRoundRow(BaseModel):
    round_id: UUID
    user_id: UUID
    user_name: str
    course_name: str | None
    date_played: date | None
    total_score: int | None
    to_par: int | None

class FriendLeaderboardRow(BaseModel):
    user_id: UUID
    user_name: str
    rounds_played: int
    scoring_avg_last10: float | None
    best_score: int | None
    best_round_id: UUID | None
```

### Frontend

**`src/lib/api.ts`** — add `getFriendsActivity()` and `getFriendsLeaderboard()` API calls.

**`src/types/golf.ts`** — add `FriendRoundRow` and `FriendLeaderboardRow` types.

**`src/pages/SocialPage.tsx`** — extend with two new sections below the friends list:

1. **Activity feed** (`FriendsActivityFeed` component): vertical list of feed rows. Each row shows avatar initials chip, friend name, course name, date, and score badge (color-coded to-par per design system). Tap row navigates to a read-only round detail view.
2. **Leaderboard card** (`FriendsLeaderboard` component): bento-style card with ranked rows (rank, name, avg score last 10, best round). Uses the same `bg-white rounded-2xl border border-gray-100 shadow-sm` card style.

**New components:**
- `src/components/social/FriendsActivityFeed.tsx`
- `src/components/social/FriendsLeaderboard.tsx`
- `src/components/social/FeedRoundRow.tsx`

**React Query keys:** `["friends-activity"]`, `["friends-leaderboard"]` — refetch on window focus.

### DB migrations

No schema changes needed. The `users.rounds`, `users.friendships`, and `courses.courses` tables already have everything required. The new queries are read-only aggregations.

---

## Estimated Complexity

**Medium** — 2–3 days of focused work.

- Backend: ~150 lines (2 endpoints + 1 repo method + response models)
- Frontend: ~300 lines (2 page sections + 3 new components + API calls + types)
- No migrations, no new infrastructure

---

## Acceptance Criteria

- [ ] Authenticated user with at least one accepted friend can visit the Social page and see that friend's most recent round (course name, date, score, to-par) without any extra steps.
- [ ] The leaderboard card ranks all accepted friends + the current user by 10-round scoring average; ties broken by best single round.
- [ ] Feed rows are empty-state-safe: a user with no friends or no friend rounds sees a prompt to add friends rather than an error or blank space.
- [ ] Activity feed rows link to a read-only round detail view of the friend's round (friend cannot edit their own rounds from the viewer's device).
- [ ] The two new endpoints return within 500 ms for a user with up to 50 friends, verified by manual timing or a basic load test.
