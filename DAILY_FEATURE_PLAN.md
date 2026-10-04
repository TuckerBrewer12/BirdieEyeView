# Daily Feature Plan — 2026-10-04

## Feature: Friends Leaderboard

**One-line description:** A ranked leaderboard that shows a golfer and all their accepted friends side-by-side, sorted by handicap index, with drill-down stats (average score, best round, rounds played).

---

## User Value

Golf is fundamentally competitive. The app already has a complete friend system (add friends, accept requests, inbox) but zero competitive payoff — there is nowhere to actually *compare yourself* to your friends. A leaderboard closes that loop and gives users a reason to open the app every week, especially after a round. It converts a contact list into a social game layer.

---

## Technical Approach

### Backend

**New endpoint: `GET /api/stats/leaderboard/{user_id}`**

File: `api/routers/stats.py`

Logic:
1. Load the requesting user's accepted friendships from `users.friendships`.
2. Collect `user_id` for each accepted friend.
3. For each player (self + friends), fetch their `users.users` row and their last 20 complete rounds.
4. Compute per-player summary:
   - `handicap_index` — from `users.users.handicap_index` (already kept current by `/stats/dashboard`)
   - `avg_score` — mean of `rounds.total_score` (last 20 complete rounds)
   - `best_score` — min `rounds.total_score` (last 20 complete rounds)
   - `rounds_played` — total count of complete rounds for that user
   - `last_round_date` — most recent `rounds.round_date`
5. Sort by `handicap_index` ascending (lowest = best); null handicaps go last.
6. Return list of `LeaderboardEntry` objects with rank attached.

New Pydantic response model in `api/request_models.py`:
```python
class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    handicap_index: Optional[float]
    avg_score: Optional[float]
    best_score: Optional[int]
    rounds_played: int
    last_round_date: Optional[str]
    is_self: bool
```

**Fetch helper in `database/repositories/user_repo.py`:**
- Add `get_accepted_friend_ids(user_id: str) -> list[str]` — queries `users.friendships WHERE (requester_id=$1 OR addressee_id=$1) AND status='accepted'`.

### Frontend

**New TypeScript type in `frontend/src/types/analytics.ts`:**
```ts
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  handicap_index: number | null;
  avg_score: number | null;
  best_score: number | null;
  rounds_played: number;
  last_round_date: string | null;
  is_self: boolean;
}
```

**New API method in `frontend/src/lib/api.ts`:**
```ts
getLeaderboard: (userId: string) =>
  fetchJSON<LeaderboardEntry[]>(`/stats/leaderboard/${userId}`),
```

**New page: `frontend/src/pages/LeaderboardPage.tsx`**

- Fetches `/stats/leaderboard/{userId}` on mount.
- Renders a ranked list card using the existing design system (`bg-white rounded-2xl border border-gray-100 shadow-sm`).
- Self row highlighted with `bg-[#eef7f0]` border-left accent in primary green.
- Rank badge: gold (#f59e0b) for #1, silver (#9ca3af) for #2, bronze (#b45309) for #3, gray for the rest.
- Stats columns: Handicap Index · Avg Score · Best Round · Rounds Played.
- Empty state: "Add friends to see how you stack up" with a link to `/social`.
- Framer-motion staggered entrance on rows (`delay: i * 0.04`).

**Route: `frontend/src/App.tsx`**
```tsx
<Route path="/leaderboard" element={<LeaderboardPage userId={userId} />} />
```

**Navigation: add "Leaderboard" link to the sidebar** (in `frontend/src/components/layout/`).

### No DB migration needed
All data required already exists:
- `users.friendships` — friend graph
- `users.users.handicap_index` — already maintained
- `users.rounds` — `total_score`, `round_date`, `is_complete`

---

## Estimated Complexity

**Medium** (~1 day of focused work)

- Backend endpoint: ~80 lines including query helper
- Frontend page: ~150 lines (design system components reused)
- Routing + nav: ~10 lines each

---

## Acceptance Criteria

- [ ] `GET /api/stats/leaderboard/{user_id}` returns a ranked list containing the requesting user plus all accepted friends; users with no rounds are included with `null` stats; unfriended/blocked users are never returned.
- [ ] The leaderboard page renders correctly with ≥1 friend, showing rank badges, handicap index, avg score, best round, and rounds played for each player.
- [ ] The requesting user's own row is visually distinguished (accent highlight) regardless of their rank position.
- [ ] Empty state (no friends yet) shows a contextual prompt linking to the Social page.
- [ ] The route is accessible from the sidebar nav and the Social page ("See Leaderboard" CTA).
