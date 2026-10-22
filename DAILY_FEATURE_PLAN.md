# Daily Feature Plan — 2026-10-22

## Feature: Friend Activity Feed on the Social Page

**One-line description:** Show friends' recent rounds and handicap index on the Social page so adding a friend actually does something useful.

---

## User Value

Right now, adding a friend results in a list of names and email addresses — nothing else. The entire social layer (friend codes, friend requests, inbox, accepted friendships) is infrastructure with no payoff. A golfer who adds a friend today has no reason to open the Social page again.

A friend activity feed turns social into a daily habit driver. Golfers are competitive by nature; seeing that a friend just shot a 79 at Torrey Pines is an immediate motivator to scan their own next round. It also surfaces handicap comparisons naturally, which is the primary social currency in golf.

---

## Technical Approach

### Backend — new endpoint (no DB migration required)

**File:** `api/routers/rounds.py`

Add a new route:
```
GET /api/rounds/friends/{friend_user_id}/recent?limit=5
```

- Auth check: caller must be authenticated AND `are_friends(current_user.id, friend_user_id)` must be true (reuse the existing `db.friendships.are_friends` helper already used in `api/routers/stats.py:can_view`).
- Returns: list of `RoundSummaryResponse` (already defined in `api/schemas.py`) — reuse `db.rounds.get_round_summaries_for_user(friend_user_id, limit=limit)`.
- Raises 403 if not friends, 404 if user not found.

**File:** `api/routers/stats.py` (or reuse existing analytics endpoint)

The existing `GET /api/stats/analytics/{user_id}` already gateways with `are_friends`. Consider adding `GET /api/stats/dashboard/{friend_user_id}` with the same friend gate so the Social page can show each friend's handicap index in one call (already computed in `DashboardResponse.handicap_index`). Alternatively, call the existing dashboard endpoint — it already does the auth check.

### Frontend

**File:** `frontend/src/lib/api.ts`

Add two helpers:
```ts
getFriendRecentRounds: (friendUserId: string, limit = 5) =>
  getJSON<RoundSummary[]>(`/rounds/friends/${friendUserId}/recent?limit=${limit}`);

getFriendDashboard: (friendUserId: string) =>
  getJSON<DashboardSummary>(`/stats/dashboard/${friendUserId}`);
```

**File:** `frontend/src/pages/SocialPage.tsx`

Replace the current flat friend list (name + email only) with expandable friend cards. Each card shows:
- Friend's name + handicap index (or "N/A" when < 3 rounds)
- Last 3 rounds: course name, score, to-par, date
- "Compare in The Lab →" deep-link to `/the-lab?friend=<id>` (route already supported)

On mount, fire one `getFriendDashboard` query per accepted friend (React Query, `queryKey: ["friend-dashboard", friendId]`). Lazy-load recent rounds on card expand to avoid N×5 queries on page open.

**New file (optional):** `frontend/src/components/social/FriendActivityCard.tsx`

Extract the card UI into its own component to keep `SocialPage.tsx` readable. Props: `friend: FriendRow`, `dashboard: DashboardSummary | undefined`, `rounds: RoundSummary[] | undefined`, `onExpand: () => void`.

### Types

**File:** `frontend/src/types/golf.ts`

No new types needed — `RoundSummary` and `DashboardSummary`/`DashboardResponse` are already defined in `src/types/analytics.ts` and `src/types/golf.ts`.

---

## No DB Migration Required

All data is already stored. The feature is purely about exposing existing data through a friend-gated read endpoint.

---

## Estimated Complexity

**Medium** — 1–2 days of focused work.

- Backend: ~40 lines (new route + `are_friends` check, reuse existing query + response model)
- Frontend: ~150 lines across API client, SocialPage, and FriendActivityCard
- No schema changes, no new migrations, no new analytics logic

---

## Acceptance Criteria

- [ ] A user with accepted friends sees each friend's current handicap index on `/social`.
- [ ] Expanding a friend card shows their last 3 rounds (course, score, to-par, date).
- [ ] A user without accepted friends still sees the "Add Friend" section with no errors.
- [ ] Attempting to fetch rounds for a non-friend returns 403 from the API (enforced server-side, not just client-side).
- [ ] "Compare in The Lab" link pre-selects the friend in The Lab's friend-comparison dropdown.

---

## Why This and Not Something Else

| Alternative | Why deprioritized |
|---|---|
| Handicap index tracking | Already fully implemented in `analytics/handicap.py` and displayed on Dashboard + Career; no user-facing gap |
| Push notifications | Requires native iOS/Capacitor wiring and an external push service; high infra overhead |
| Strokes gained analytics | High value but requires a large baseline dataset to be meaningful; data-quality risk |
| Weather auto-fill | Nice-to-have UX polish; lower engagement impact |

The friend feed completes an already-half-built feature with minimal new infrastructure and maximum engagement payoff.
