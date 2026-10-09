# Daily Feature Plan — 2026-10-09

## Feature: Public Round Share Pages

**One-line description:** Let golfers share any saved round as a public, no-login-required URL so they can brag to friends or post on social media.

---

## User Value

Golf is social by nature — players constantly compare scores and relive rounds with their group. Right now BirdieEyeView has a `ShareCard` component that exports a static SVG image, but there's no shareable link. A golfer who shoots their best round has nowhere to send friends; they're stuck screenshotting a local render.

A public round URL (`/r/:roundId`) means:
- Copy a link and paste it in iMessage, WhatsApp, or an Instagram story
- Friends can view the full hole-by-hole scorecard without signing up
- Natural virality: a viewer sees the app, decides to try it, scans their own card

This also completes the social loop that's halfway built — Friends/inbox infrastructure exists but currently has no round-visibility payoff.

---

## Technical Approach

### DB Migration — `database/migrations/004_public_rounds.sql`
```sql
ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_rounds_is_public
    ON users.rounds (id) WHERE is_public = TRUE;
```

### Backend

**`api/routers/rounds.py`** — add one unauthenticated endpoint:
```python
GET /api/rounds/{round_id}/public
```
- Uses `get_optional_current_user` (no auth required)
- Returns 404 if `is_public = FALSE` and caller is not the owner
- Returns round + hole scores + course name / par (same shape as the existing `GET /api/rounds/{id}` but stripped of private fields like `user_id`)

**`api/routers/rounds.py`** — add toggle on the existing `PUT /api/rounds/{id}`:
- Accept `is_public: Optional[bool]` on `UpdateRoundRequest` (in `api/request_models.py`)
- Pass it through to `db.rounds.update_round()`

**`database/repositories/round_repo.py`**
- Add `is_public` to the `UPDATE` statement in `update_round()`
- Add `is_public` to the round SELECT so it's returned by `get_round()`

### Frontend

**New file: `frontend/src/pages/public/PublicRoundPage.tsx`**
- Route: `/r/:roundId` — add to `AppRoutes` **outside** the auth guard (accessible when `!userId` too)
- Fetches `GET /api/rounds/{roundId}/public` via a new `api.getPublicRound(id)` function in `src/lib/api.ts`
- Renders the existing `<ScorecardGrid>` (already handles `par_played` fallback) + score-type badge row
- Shows course name, date, player score, to-par summary
- "Play BirdieEyeView" CTA button at the bottom linking to `/register`
- No sidebar / auth layout — use the existing `<PublicNav>` header

**`frontend/src/pages/RoundDetailPage.tsx`**
- Add a "Share" button next to the existing share-image button
- On click: calls `PUT /api/rounds/{id}` with `{ is_public: true }`, then copies `window.location.origin + "/r/" + roundId` to clipboard via `navigator.clipboard.writeText`
- Shows a toast "Link copied!" on success
- Optionally: toggle back to private with a second click

**`frontend/src/lib/api.ts`**
```ts
getPublicRound: (roundId: string) =>
  fetchJSON<Round>(`/rounds/${roundId}/public`),
```

### Files changed / added

| File | Change |
|---|---|
| `database/migrations/004_public_rounds.sql` | New — adds `is_public` column |
| `database/schema.sql` | Add `is_public` column to `users.rounds` definition |
| `database/repositories/round_repo.py` | Read/write `is_public` |
| `api/request_models.py` | Add `is_public: Optional[bool]` to `UpdateRoundRequest` |
| `api/routers/rounds.py` | New `GET /rounds/{id}/public` + pass `is_public` through PUT |
| `frontend/src/lib/api.ts` | `getPublicRound()` |
| `frontend/src/pages/public/PublicRoundPage.tsx` | New page |
| `frontend/src/App.tsx` | Add `/r/:roundId` route outside auth guard |
| `frontend/src/pages/RoundDetailPage.tsx` | Share-link button + clipboard copy |

---

## Estimated Complexity

**Medium** — ~2–3 hours of focused work.

- DB migration is one line
- Backend endpoint is a minor variation of the existing round GET
- Frontend page reuses `ScorecardGrid` and `PublicNav` with no new primitives
- The trickiest part is the auth-bypass routing in `App.tsx` (need to check `/r/` paths before the `!userId` redirect guard)

---

## Acceptance Criteria

- [ ] A user can click "Copy share link" on any round detail page; the round is marked public and the URL is copied to clipboard
- [ ] Visiting `/r/:roundId` in a fresh incognito window (no login) renders the full scorecard with hole scores, course name, score, and to-par
- [ ] Rounds that are not marked public return a "Round not found" message (no data leak)
- [ ] The public page shows a "Track your rounds on BirdieEyeView" CTA that links to `/register`
- [ ] The share link can be toggled back to private from the round detail page, after which the public URL returns 404
