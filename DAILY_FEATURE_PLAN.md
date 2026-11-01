# Daily Feature Plan — 2026-11-01

## Feature: Public Round Share Links

**One-line description:** Generate a shareable public URL for any round so golfers can show off their scorecard to anyone — no login required.

---

## User Value

Golfers live for sharing their best (and worst) rounds. Right now the app has no way to send a round to a friend who isn't on the platform, or post a scorecard to social media. A public share link closes this gap instantly:

- **Social moments**: copy a link after a personal best and drop it in a group chat or on Instagram Stories.
- **Recruiting friends**: show a non-user exactly what the app produces — the share page is a live demo.
- **The infrastructure is already 80% there**: `frontend/src/components/share/ShareCard.tsx` renders a polished SVG scorecard. It just needs a public URL to live at.

---

## Technical Approach

### 1. Database Migration — `database/migrations/013_add_round_share_token.sql`

```sql
ALTER TABLE users.rounds
  ADD COLUMN IF NOT EXISTS share_token  UUID    DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_share_token
  ON users.rounds (share_token)
  WHERE share_enabled = TRUE;
```

No existing rows break: `share_enabled` defaults `FALSE`, so nothing is accidentally public.

### 2. Backend — new endpoints in `api/routers/rounds.py`

**Enable / get share link (auth required):**
```
POST /api/rounds/{round_id}/share
→ { share_token: str, share_url: str }
```
Sets `share_enabled = TRUE` if not already set. Returns the token. No-op if already enabled (idempotent).

**Disable sharing (auth required):**
```
DELETE /api/rounds/{round_id}/share
→ 204 No Content
```
Sets `share_enabled = FALSE`.

**Public read — no auth (new router `api/routers/public.py`):**
```
GET /api/public/rounds/{share_token}
→ { round, course_name, player_name }
```
Returns only the fields needed to render the ShareCard: hole scores, course name, total score, tee box, player display name. Explicitly omits user email, handicap index, and other private fields. Returns 404 if `share_enabled = FALSE`.

Register in `api/main.py`:
```python
app.include_router(public_router, prefix="/api/public")
```

**Repository layer** — `database/repositories/round_repo.py`:
- `enable_share(round_id, user_id) → share_token`
- `disable_share(round_id, user_id)`
- `get_round_by_share_token(token) → RoundPublicView | None`

### 3. Frontend

**New public page — `frontend/src/pages/public/PublicRoundPage.tsx`**
- Route: `/share/:token` (no `<PrivateRoute>` wrapper)
- Fetches `GET /api/public/rounds/:token`
- Renders the existing `<ShareCard>` component
- Shows a sticky "Track your rounds → Sign up free" CTA banner at the bottom (acquisition hook)
- Clean loading / 404 state

**Route change — `frontend/src/App.tsx`**
```tsx
<Route path="/share/:token" element={<PublicRoundPage />} />
```
Add above the `<PrivateRoute>` block so unauthenticated users land here.

**Share button — `frontend/src/pages/RoundDetailPage.tsx`**
- Add a "Share" button in the round header action row
- On click: calls `POST /api/rounds/{id}/share`, shows the resulting URL in a modal
- Modal has: copy-to-clipboard button, a live preview of the ShareCard, and a "Disable sharing" toggle
- New component: `frontend/src/components/round-detail/ShareRoundModal.tsx`

**API helpers — `frontend/src/lib/api.ts`**
```ts
enableRoundShare(roundId: string): Promise<{ share_token: string; share_url: string }>
disableRoundShare(roundId: string): Promise<void>
getPublicRound(token: string): Promise<PublicRoundData>
```

---

## Estimated Complexity

**Medium** — The visual layer (`ShareCard`) is already done. The new work is:
- 1 migration (trivial)
- ~80 lines of Python (2 route handlers + repo methods)
- 1 new public page (~120 lines TSX)
- 1 modal component (~80 lines TSX)
- 3 API helpers

No schema redesign, no new external dependencies, no auth flow changes.

---

## Acceptance Criteria

1. **A signed-in user can generate a share link** from the round detail page; clicking "Share" produces a unique URL and copies it to the clipboard within one interaction.
2. **The public page is accessible without login** — opening the share URL in an incognito window renders the full scorecard with hole-by-hole scores, score-type symbols, and the course name.
3. **Sharing can be revoked** — toggling "Disable sharing" in the modal makes the public URL return a 404 immediately (no caching lag visible to the user).
4. **Private data is not leaked** — the public API response contains no email address, handicap index, or user ID; only display name, course name, and score data.
5. **The public page includes an acquisition CTA** — a non-intrusive banner invites the viewer to sign up, linking to `/register`.
