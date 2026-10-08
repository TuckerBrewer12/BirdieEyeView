# Daily Feature Plan — 2026-10-08

## Feature: Friends Weekly Leaderboard

**One-line description:** A weekly leaderboard showing how you and your accepted friends stack up based on rounds played in the last 7 days, with side-by-side hole-by-hole comparison on tap.

---

## User Value

Golfers are inherently competitive with their regular playing partners. Right now the app has a fully wired friends graph (friend codes, accept/decline, friendships table) but nothing social to show for it — the SocialPage is a dead end after adding friends.

A weekly leaderboard closes that loop. It gives users a reason to open the app every day, a reason to tell their friends about it ("add me on BirdieEyeView so you can see my 79"), and a weekly narrative arc that resets every Monday. Competition with people you know is the most durable engagement mechanic in sports apps.

---

## Technical Approach

### What already exists (no changes needed)
- `users.friendships` table with `status = 'accepted'` filtering
- `users.rounds` with `round_date`, `total_score`, `course_name_played`, `course_id`
- `GET /api/stats/compare/{user_id}/{round_id}` endpoint
- `GET /api/users/me/friends` returns accepted friendships
- `GET /api/rounds/user/{user_id}` returns a user's rounds
- `GET /api/rounds/{round_id}` returns full hole detail
- `frontend/src/pages/SocialPage.tsx` and route `/social` already exist

### New backend

**1. `api/routers/leaderboard.py`** — new router

```
GET /api/leaderboard/{user_id}?days=7
```

Response:
```json
{
  "week_label": "Oct 6 – Oct 12",
  "entries": [
    {
      "user_id": "...",
      "name": "Tucker",
      "is_self": true,
      "rank": 1,
      "best_round": {
        "round_id": "...",
        "total_score": 79,
        "to_par": +7,
        "course_name": "Rancho Santa Margarita GC",
        "round_date": "2026-10-07"
      },
      "rounds_this_week": 2,
      "handicap_index": 12.4
    },
    ...
  ]
}
```

Logic:
1. Fetch accepted friend `user_id`s via `friendships` table (both directions)
2. Include the requesting user themselves
3. For each user, query rounds where `round_date >= NOW() - INTERVAL '7 days'` and `is_complete = true`
4. Rank by best (lowest) `total_score` this week; users with no rounds ranked last alphabetically
5. Return friend name, rank, best round summary

**2. Register in `api/main.py`**
```python
from api.routers import leaderboard
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
```

**3. `database/repositories/leaderboard_repo.py`** — new repository

Single async query joining `users.friendships`, `users.users`, and `users.rounds`. No new tables needed.

### New frontend

**1. `frontend/src/types/leaderboard.ts`** — TypeScript types matching the API response

**2. `frontend/src/lib/api.ts`** — add `getWeeklyLeaderboard(userId)` fetch call

**3. `frontend/src/pages/SocialPage.tsx`** — refactor/extend

Replace the current thin friends-list UI with a tabbed layout:
- Tab 1: **This Week** — leaderboard table (rank, avatar initial, name, score/to-par, course, rounds played)
- Tab 2: **Friends** — existing friend list + friend code share

Leaderboard row tap → opens `RoundCompareSheet` (bottom drawer on mobile)

**4. `frontend/src/components/social/LeaderboardTable.tsx`** — new component

Animated table rows using existing Framer Motion patterns (`initial={{ opacity: 0, x: -12 }}`). Top-3 rows get rank medal colors (gold/silver/bronze). Self row highlighted with `bg-primary/5 border-l-2 border-primary`.

**5. `frontend/src/components/social/RoundCompareSheet.tsx`** — new component

Side-by-side hole-by-hole table: your scores vs. a friend's scores for their best round, with per-hole delta and score-type color coding (using existing semantic palette). Reuses `HoleScore` types and `getScoreType()` logic already in the codebase.

### No DB migrations needed

All required data is in existing tables. No schema changes.

---

## Estimated Complexity

**Medium**

- ~250 lines of backend (new router + repo, SQL query)
- ~350 lines of frontend (2 new components + SocialPage extension + types + API call)
- No migrations, no new models, no new env vars
- Builds entirely on existing data and auth patterns

---

## Acceptance Criteria

- [ ] `GET /api/leaderboard/{user_id}` returns a ranked list of the authenticated user + all accepted friends, filtered to rounds in the current 7-day window; users with no rounds appear at the bottom with `best_round: null`
- [ ] The `/social` page shows a "This Week" tab with the leaderboard table; the user's own row is visually distinguished; ranks 1–3 show medal styling
- [ ] Tapping any leaderboard row with a round opens a comparison sheet showing hole-by-hole scores side-by-side (user's closest round this week vs. the tapped friend's best round)
- [ ] The leaderboard is empty-state friendly: if neither the user nor any friends have played this week, a "No rounds yet this week — go play!" prompt appears with a shortcut to the scan page
- [ ] The feature works with 0 friends (shows only the current user's row) and gracefully handles friends who have not verified their email or have no rounds ever
