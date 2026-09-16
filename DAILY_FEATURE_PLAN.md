# Daily Feature Plan — 2026-09-16

## Feature: Friend Round Feed ("Share a Round")

**One-line description:** Let users share completed rounds directly with friends, with a social feed page showing recent friend activity and an unread badge on the nav.

---

## User Value

Golf is inherently social — players compare scores after every round. The app already supports adding friends, but there is no way to *do anything* with that friendship graph: friends cannot see each other's rounds, there is no shared context, and the social feature stops at "accepted." Adding a round feed closes that loop. A golfer who just shot their best round has a strong desire to share it; a friend who sees that round has a reason to open the app. This is the highest-leverage engagement feature the app is missing.

The infrastructure is already ~60% complete:
- `friendships` table is live with `accepted` status filtering
- `ShareCard` component exists at `frontend/src/components/share/ShareCard.tsx`
- `useShareRound` hook exists at `frontend/src/hooks/useShareRound.ts`
- `RoundDetailPage` already renders the full scorecard with all per-hole data

---

## Technical Approach

### 1. Database Migration — `database/migrations/004_round_shares.sql`

```sql
CREATE TABLE users.round_shares (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id    UUID NOT NULL REFERENCES users.rounds(id) ON DELETE CASCADE,
    sharer_id   UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    seen_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (round_id, recipient_id)
);
CREATE INDEX idx_round_shares_recipient ON users.round_shares(recipient_id, created_at DESC);
```

### 2. Backend

**`database/repositories/round_repo.py`** — add:
- `share_round(round_id, sharer_id, recipient_ids)` — inserts rows, raises 403 if not friends
- `get_feed(user_id, limit, offset)` — returns shared rounds with sharer info, joined to rounds + courses
- `mark_feed_seen(user_id)` — sets `seen_at = now()` for all unseen shares for this user
- `get_unseen_feed_count(user_id)` — count of `seen_at IS NULL` rows for badge

**`api/routers/rounds.py`** — add:
- `POST /api/rounds/{round_id}/share` — body `{ recipient_ids: UUID[] }`; validates friendship, calls `share_round`
- `GET /api/users/me/feed?limit=20&offset=0` — calls `get_feed`; marks seen on read
- `GET /api/users/me/feed/unread-count` — lightweight badge count endpoint

**`api/request_models.py`** — add `ShareRoundRequest` model.

### 3. Frontend

**`frontend/src/lib/api.ts`** — add:
- `shareRound(roundId, recipientIds)` → `POST /api/rounds/{id}/share`
- `getFeed(limit, offset)` → `GET /api/users/me/feed`
- `getUnreadFeedCount()` → `GET /api/users/me/feed/unread-count`

**`frontend/src/pages/FeedPage.tsx`** (new) — social feed page at `/feed`:
- Lists friend-shared rounds newest-first (infinite scroll or pagination)
- Each row: friend avatar/name, course name, score + to-par, date
- Clicking a row navigates to read-only round detail (reuse `RoundDetailPage` or a modal)
- Empty state: "Add friends to see their rounds" → links to `/social`

**`frontend/src/components/share/ShareRoundModal.tsx`** (new) — modal triggered from `RoundDetailPage`:
- Shows accepted friends list with checkboxes
- Calls `shareRound()`; shows success toast
- Wire `ShareCard` (already exists) into the confirmation/success UI

**`frontend/src/pages/RoundDetailPage.tsx`** — add a "Share" button in the header that opens `ShareRoundModal`.

**`frontend/src/components/layout/Sidebar.tsx`** and **`BottomNav.tsx`** — add unread badge to the feed nav item using `getUnreadFeedCount()` (poll on mount, ~30s interval or on page focus).

**`frontend/src/App.tsx`** — add `/feed` route pointing to `FeedPage`.

### Files to change
| File | Change |
|---|---|
| `database/migrations/004_round_shares.sql` | New migration |
| `database/schema.sql` | Add `round_shares` table definition |
| `database/repositories/round_repo.py` | 4 new methods |
| `api/routers/rounds.py` | 3 new endpoints |
| `api/request_models.py` | `ShareRoundRequest` |
| `frontend/src/lib/api.ts` | 3 new API calls |
| `frontend/src/App.tsx` | `/feed` route |
| `frontend/src/pages/FeedPage.tsx` | New page |
| `frontend/src/components/share/ShareRoundModal.tsx` | New component |
| `frontend/src/pages/RoundDetailPage.tsx` | Share button |
| `frontend/src/components/layout/Sidebar.tsx` | Unread badge |
| `frontend/src/components/layout/BottomNav.tsx` | Unread badge |

---

## Estimated Complexity

**Medium** — ~2–3 days of focused work. The hardest part is the feed query (join across round_shares, rounds, hole_scores, courses) and the friend-gate validation. Frontend is mostly composition of existing patterns (RoundDetailPage for the read-only view, existing card/list styles).

---

## Acceptance Criteria

- [ ] From `RoundDetailPage`, a "Share" button opens a modal listing accepted friends; selecting one or more and confirming calls `POST /api/rounds/{id}/share` and shows a success toast.
- [ ] `/feed` page lists shared rounds from friends, ordered by share date, with sharer name, course, score, and to-par displayed.
- [ ] The Sidebar and BottomNav show a numeric unread badge on the feed icon that reflects unseen incoming shares; the badge clears after visiting `/feed`.
- [ ] Sharing is gated on an accepted friendship — attempting to share with a non-friend returns a 403 and the UI surfaces an appropriate error.
- [ ] A round can only be shared to each friend once (duplicate `UNIQUE(round_id, recipient_id)` constraint); re-sharing the same round to the same friend is a no-op with a friendly UI message.
