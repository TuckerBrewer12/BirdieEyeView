# Daily Feature Plan — 2026-09-13

## Feature: Friend Profile & Stats Viewer

**One-line description:** Let a golfer tap any accepted friend and see their handicap, recent rounds, and analytics highlights — completing the social loop the friend system already started.

---

## User Value

The friend-request system (add by code, accept/decline, block) is fully built, but right now it's a dead end: you can have friends and they can see nothing about each other. Golfers are inherently competitive and socially motivated — "my buddy shot an 84, I need to beat that" is one of the strongest reasons to log a round. Surfacing a friend's handicap trend, best rounds, and scoring averages turns the friend list from a contacts book into a live leaderboard. This directly increases retention and gives users a compelling reason to keep scanning scorecards.

---

## Technical Approach

### What Already Exists (no new backend needed)

- `GET /api/stats/analytics/{user_id}` — full analytics payload, already friendship-gated (returns 403 for non-friends)
- `GET /api/stats/dashboard/{user_id}` — dashboard summary (avg score, handicap, best round, recent rounds)
- `GET /api/rounds/user/{user_id}` — round list with basic stats
- `users.friendships` table — accepted/declined/blocked statuses are stored
- `GET /api/users/{id}/friends` endpoint (or equivalent friendship listing) in `users.py`

### Files to Add

| File | Purpose |
|---|---|
| `frontend/src/pages/FriendProfilePage.tsx` | New page at `/friends/:friendId` — friend's dashboard view |
| `frontend/src/components/friends/FriendStatsSummary.tsx` | Handicap trend sparkline + scoring avg + best round card |
| `frontend/src/components/friends/FriendRoundsList.tsx` | Recent rounds list (read-only, reuses round row component) |

### Files to Change

| File | Change |
|---|---|
| `frontend/src/App.tsx` | Add route `/friends/:friendId` → `FriendProfilePage` |
| `frontend/src/pages/SocialPage.tsx` | Make each accepted-friend row a link → `/friends/:friendId` |
| `frontend/src/lib/api.ts` | Add `getFriendDashboard(friendId)` and `getFriendAnalytics(friendId)` wrappers (calls existing endpoints) |

### DB Migrations

**None required.** The schema and API layer are complete. The friendship authorization check in `stats.py` already returns 403 for non-friends, so privacy is enforced server-side.

### Implementation Notes

- `FriendProfilePage` should be intentionally simpler than the full AnalyticsPage — show a curated "friend card": handicap index (with trend arrow), scoring average, best round badge, last 5 rounds list, and a score-type donut from the existing analytics payload.
- Reuse the `ScoreTypeBadge` and `HolesPlayedSummary` components already used on RoundsPage.
- If the current user is NOT a friend (or the friendship is pending), the page should show a friendly "You and [name] aren't friends yet" state rather than a raw 403.
- No sharing of personally identifying info beyond what the user has already consented to share with friends.

---

## Estimated Complexity

**Medium** — approximately 1–2 days of focused work.
- 3 new frontend files (~300 lines total)
- 2 small edits to existing files
- No backend work, no migrations, no new API routes
- Risk: the existing friendship-check middleware in `stats.py` needs verification that it correctly identifies the *requesting* user (via session/token), not just the target user_id. If the endpoint reads user_id from the URL rather than the auth token, a non-friend could view anyone's stats by guessing IDs — worth auditing before shipping.

---

## Acceptance Criteria

- [ ] Tapping an accepted friend on the Social page navigates to `/friends/:friendId` and displays their name, handicap index, and scoring average without errors.
- [ ] The friend's last 5 rounds are listed with date, course name, and score; clicking a round does NOT navigate to the round detail (read-only, privacy boundary).
- [ ] Visiting `/friends/:friendId` for a user you are not friends with (or whose request is pending) shows a graceful "Not connected" message rather than a 403 error page.
- [ ] The backend correctly rejects analytics requests where the requesting user is not an accepted friend of the target user (friendship check is on the *requester's* identity, not the URL param).
- [ ] The friend profile page is responsive on mobile (single-column layout, touch targets ≥ 44px).
