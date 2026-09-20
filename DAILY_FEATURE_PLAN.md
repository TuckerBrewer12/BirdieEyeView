# Daily Feature Plan — 2026-09-20

## Feature: Friends Activity Feed

**One-line description:** A live feed in the Social page showing recent rounds from accepted friends, with scores, course names, and score-type distribution.

---

## User Value

Golfers are inherently competitive and social. Right now the friend system (codes, requests, inbox) is fully built, but once you add a friend there's nothing to do with that connection — no way to see how they've been playing. 

A feed closes that loop: you open the app, see that a buddy just shot 78 at their home course, and feel motivated to log your own round. It creates daily-open habit: "check how friends played this weekend." It also rewards users who have built a friends list — the existing social infrastructure pays off.

---

## Technical Approach

### Backend — new query + endpoint

**File to add:** `api/routers/social.py`  
New router mounted at `/api/social` in `api/main.py`.

Endpoint: `GET /api/social/feed/{user_id}?limit=20`
- Requires `get_current_user` auth guard (403 if caller ≠ user_id)
- Calls new repo method `get_friends_recent_rounds(user_id, limit)`
- Returns list of `FriendRound` objects

**File to edit:** `database/repositories/round_repo.py`  
Add `get_friends_recent_rounds(user_id: str, limit: int) -> list[dict]`:

```sql
SELECT
    r.id,
    r.date,
    r.total_score,
    r.course_name_played,
    r.tee_box,
    u.id  AS friend_id,
    u.name AS friend_name,
    c.name AS linked_course_name,
    COUNT(hs.id)                                         AS holes_played,
    COUNT(hs.id) FILTER (WHERE hs.strokes < hs.par_played)   AS birdies_plus,
    COUNT(hs.id) FILTER (WHERE hs.strokes = hs.par_played)   AS pars,
    COUNT(hs.id) FILTER (WHERE hs.strokes = hs.par_played+1) AS bogeys,
    COUNT(hs.id) FILTER (WHERE hs.strokes > hs.par_played+1) AS doubles_plus
FROM users.rounds r
JOIN users.users  u  ON u.id = r.user_id
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
  AND r.total_score IS NOT NULL
GROUP BY r.id, u.id, u.name, c.name
ORDER BY r.date DESC
LIMIT $2
```

**File to edit:** `database/db_manager.py`  
Expose `rounds.get_friends_recent_rounds` on the `DatabaseManager` facade.

**File to edit:** `api/schemas.py` (or `api/request_models.py`)  
Add `FriendRoundItem` Pydantic response model:
```python
class FriendRoundItem(BaseModel):
    round_id: str
    friend_id: str
    friend_name: str
    date: Optional[date]
    course_name: Optional[str]
    tee_box: Optional[str]
    total_score: Optional[int]
    holes_played: int
    birdies_plus: int
    pars: int
    bogeys: int
    doubles_plus: int
```

---

### Frontend

**File to edit:** `frontend/src/lib/api.ts`  
Add `getFriendsFeed(userId: string, limit?: number): Promise<FriendRoundItem[]>`.

**File to edit:** `frontend/src/types/golf.ts`  
Add `FriendRoundItem` interface mirroring the backend schema.

**File to edit:** `frontend/src/pages/SocialPage.tsx`  
Add a "Recent Rounds" section below the Add Friend panel:

- `useQuery` call for `getFriendsFeed(userId)`
- Empty state: "Add friends to see their rounds here."
- Loading skeleton: 3 ghost rows
- Feed card per round:
  - Friend avatar initials circle + name
  - Course name + date (formatted as "Sep 19")
  - Total score badge (colored by score type: green = under par, amber = even, red = over)
  - Mini score-type bar: birdie/par/bogey/double+ proportional colored segments
  - To-par delta (e.g. "+4", "E", "-1") in semantic color

Use existing score-type colors from the design system (`#059669` birdie, `#9ca3af` par, `#ef4444` bogey, `#60a5fa` double+).

---

## No Database Migration Needed

All required tables exist (`users.friendships`, `users.rounds`, `users.hole_scores`, `courses.courses`, `users.users`). No schema changes needed.

---

## Estimated Complexity

**Medium**

- ~60 lines of SQL + Python in the repo layer
- ~30 lines for the new FastAPI endpoint  
- ~120 lines of new React UI in `SocialPage.tsx`
- No new tables, no migrations, no new infrastructure

Estimated effort: 3–4 hours end-to-end.

---

## Acceptance Criteria

1. **Feed populates:** The Social page shows up to 20 recent rounds from accepted friends, sorted by date descending. Empty state shows a clear message when the user has no friends yet.

2. **Correct data:** Each feed card displays the correct friend name, course name (falling back to `course_name_played` when no linked course), date, total score, and score distribution (birdies+/pars/bogeys/doubles+) derived from `hole_scores`.

3. **Auth guard:** The feed endpoint returns 403 when called with a different user's ID. The query never leaks rounds from non-friend users.

4. **Performance:** Feed endpoint responds in < 200 ms for a user with up to 50 friends with up to 200 rounds each (single indexed JOIN query; no N+1).

5. **Graceful empty/error states:** Feed shows a skeleton loader during fetch, and an error message (not a crash) if the API call fails.
