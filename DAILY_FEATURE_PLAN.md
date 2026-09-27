# Daily Feature Plan — 2026-09-27

## Feature: Friend Profile Pages & Social Leaderboard

**One-line description:** Make friend rows in the Social page clickable, opening a friend's profile with their recent rounds, handicap trend, scoring average, and a mini-leaderboard across all accepted friends.

---

## User Value

The Social tab is currently a dead end. A golfer can add friends, but clicking a friend's name does nothing — there is no way to see their scores, track how they're improving, or compare handicaps. The friendship system exists purely as plumbing with no payoff.

This feature activates the social layer that's already been built:
- Golfers can **see how their buddies are playing** without texting them
- A one-glance **leaderboard** across your friend group creates healthy competition and a reason to keep the app open
- Because all stat APIs already gate access on friendship, there's no new security surface to build — just UI wired to existing endpoints

---

## Technical Approach

### Backend (minimal changes needed)

The analytics API in `api/routers/stats.py` already performs an `are_friends` check before returning data for another user. The Lab page (`frontend/src/components/the-lab/`) already fetches a friend's radar data. No new DB migrations are needed.

**New endpoint (small):** Add `GET /api/users/{friend_id}/public-profile` to `api/routers/users.py` that returns name, handicap, scoring average (last 20 rounds), and round count for any accepted friend. This avoids exposing full user objects.

```python
# api/routers/users.py — new route
@router.get("/{friend_id}/public-profile")
async def get_friend_public_profile(friend_id: UUID, current_user = Depends(get_current_user), db = Depends(get_db)):
    # verify friendship, return {name, handicap, scoring_avg, round_count, joined_date}
```

**New endpoint (small):** Add `GET /api/users/{user_id}/friends-leaderboard` to `api/routers/users.py` that returns all accepted friends plus the requesting user, sorted by scoring average, with name + handicap + avg_score.

### Frontend

**New page:** `frontend/src/pages/FriendProfilePage.tsx`
- Route: `/friends/:friendId`
- Sections: Profile header (name, handicap, scoring average), Recent Rounds list (last 10 rounds — date, course, score, to-par), Handicap trend sparkline (reuse `SVGHandicapTrend` from analytics), Score type breakdown donut (reuse from analytics)
- Fetches via new `/api/users/:friendId/public-profile` + existing `/api/stats/:friendId/analytics` (already friend-gated)
- Reuse existing brand components: `PageTitle`, `Panel`, `RoundPreview`

**Update:** `frontend/src/pages/SocialPage.tsx`
- Wrap each friend row in `<Link to={/friends/${friend.id}}>` — currently they are plain divs
- Add a **Friends Leaderboard** section above the friend list: a compact ranked table showing avatar initial, name, scoring average, and handicap for all accepted friends + self. Sorted by scoring average ascending (lower is better in golf).

**New API client methods:** Add `getFriendPublicProfile(friendId)` and `getFriendsLeaderboard()` to `frontend/src/lib/api.ts`.

**New type:** Add `FriendPublicProfile` and `FriendsLeaderboardEntry` to `frontend/src/types/golf.ts`.

### Files to Change

| File | Change |
|---|---|
| `api/routers/users.py` | Add `GET /{friend_id}/public-profile` and `GET /{user_id}/friends-leaderboard` routes |
| `api/request_models.py` | Add `FriendPublicProfileResponse`, `FriendsLeaderboardEntry`, `FriendsLeaderboardResponse` schemas |
| `frontend/src/lib/api.ts` | Add `getFriendPublicProfile()` and `getFriendsLeaderboard()` |
| `frontend/src/types/golf.ts` | Add `FriendPublicProfile` and `FriendsLeaderboardEntry` types |
| `frontend/src/pages/SocialPage.tsx` | Wrap friend rows in `<Link>`, add leaderboard section |
| `frontend/src/App.tsx` | Register `/friends/:friendId` route |

### New Files to Add

| File | Purpose |
|---|---|
| `frontend/src/pages/FriendProfilePage.tsx` | Friend profile view (rounds, handicap trend, score breakdown) |

### No DB migrations needed

All required data (handicap, rounds, hole scores, friendships) exists in the current schema.

---

## Estimated Complexity: **Medium**

- Backend: ~2–3 hours (2 new route handlers, 3 response schemas, friendship validation logic)
- Frontend: ~4–6 hours (new page with 3 sections, SocialPage wiring, leaderboard table, API client methods)
- Total: ~1 day of focused work

---

## Acceptance Criteria

- [ ] Clicking a friend's name in the Social page navigates to `/friends/:friendId` without a 404
- [ ] The friend profile page shows their name, handicap, scoring average (last 20 rounds), and a list of their 10 most recent rounds with date, course, and score
- [ ] The Social page displays a leaderboard table ranking all accepted friends (+ yourself) by scoring average, with handicap shown as a secondary column
- [ ] A user who is not friends with the target receives a 403 from both new API endpoints (no data leak)
- [ ] The friend profile page is responsive and matches the existing app design system (forest green primary, `rounded-2xl` cards, `shadow-sm`, Inter font)
