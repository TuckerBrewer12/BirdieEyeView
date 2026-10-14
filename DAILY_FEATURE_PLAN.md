# Daily Feature Plan — 2026-10-14

## Feature: Shareable Public Round Link

**One-line description:** Generate a unique, publicly-accessible URL for any saved round so golfers can share their scorecard with anyone — no login required to view.

---

## User Value

Right now, "sharing" a round exports a static PNG image. That image goes stale, can't be zoomed or bookmarked, and forces the viewer to accept a file. A shareable link fixes this:

- **Instant social proof** — paste the URL into a group chat, Instagram bio, or Discord server and anyone can see the full hole-by-hole scorecard in a clean browser page.
- **Viral growth driver** — every shared round exposes new users to BirdieEyeView without them needing an account.
- **Better mobile experience** — a link opens natively on iOS/Android; a PNG requires a download.
- **Opt-in privacy** — rounds are private by default; the golfer explicitly enables sharing. A revoke button makes the link dead immediately.

---

## Technical Approach

### Database — Migration 013

File: `database/migrations/013_shareable_rounds.sql`

```sql
ALTER TABLE users.rounds
  ADD COLUMN share_token VARCHAR(16) UNIQUE,
  ADD COLUMN is_public   BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_rounds_share_token
  ON users.rounds (share_token)
  WHERE share_token IS NOT NULL;
```

Also update `database/schema.sql` with these two columns on `users.rounds`.

### Backend

**`database/repositories/round_repo.py`** — add two methods:
- `get_round_by_share_token(token: str) -> Optional[Round]` — no user_id filter, returns round only when `is_public = TRUE`
- `set_round_public(round_id: str, public: bool) -> str` — flips `is_public`, generates `share_token` via `secrets.token_urlsafe(12)` on first enable, returns the token

**`api/routers/rounds.py`** — add two endpoints:
- `POST /api/rounds/{round_id}/share` — auth-required (owner only), calls `set_round_public(True)`, returns `{ "share_url": "...", "share_token": "..." }`
- `DELETE /api/rounds/{round_id}/share` — auth-required (owner only), calls `set_round_public(False)`, returns `{ "is_public": false }`

**`api/routers/public.py`** (new file) — unauthenticated router:
- `GET /api/public/rounds/{share_token}` — calls `get_round_by_share_token`, returns a sanitized round payload (hole scores, course name, date, total score, to-par, tee color); 404 if not found or `is_public = FALSE`

**`api/main.py`** — register `public.router` with prefix `/api/public` and no auth dependency.

### Frontend

**`frontend/src/lib/api.ts`** — add:
- `shareRound(roundId: string): Promise<{ share_url: string; share_token: string }>`
- `unshareRound(roundId: string): Promise<void>`
- `getPublicRound(token: string): Promise<PublicRound>` (no auth header)

**`frontend/src/pages/PublicRoundPage.tsx`** (new file):
- Route: `/r/:token` (no auth guard)
- Fetches from `GET /api/public/rounds/:token`
- Renders a standalone scorecard page reusing `ShareCard` visual design:
  - Full 18-hole grid with score colors and to-par
  - Course name, date, total score, score type distribution
  - "Download as image" button (reuses existing `html-to-image` + `toPng` logic)
  - BirdieEyeView logo footer as subtle call-to-action
- No sidebar/nav; clean standalone layout

**`frontend/src/App.tsx`** — add public route:
```tsx
<Route path="/r/:token" element={<PublicRoundPage />} />
```

**`frontend/src/pages/RoundDetailPage.tsx`** — update share flow:
- Replace the current PNG-only share button with a "Share" dropdown containing two options:
  1. **"Get Link"** — calls `shareRound()`, copies URL to clipboard, shows a toast "Link copied!"; button state changes to show the URL with a copy icon
  2. **"Save Image"** — existing PNG export (unchanged)
- When round is already public: show "Copy Link" and "Remove Link" (calls `unshareRound()`)

---

## Estimated Complexity

**Medium** — clean addition with no changes to existing data flows, no breaking API changes, and most UI work reuses existing components.

Rough estimate: 1–2 days of focused implementation.

---

## Acceptance Criteria

- [ ] `POST /api/rounds/{id}/share` returns a `share_url` of the form `https://{host}/r/{token}`; calling it again returns the same token
- [ ] `GET /api/public/rounds/{token}` returns full round data with no `Authorization` header and 404 for unknown/private tokens
- [ ] The public URL (`/r/:token`) renders a clean scorecard page without login, showing all hole scores, course name, date, total score, and to-par
- [ ] The share UI in `RoundDetailPage` shows a "Get Link" button that copies the URL and shows a toast confirmation; already-shared rounds show a "Remove Link" option
- [ ] `DELETE /api/rounds/{id}/share` sets `is_public = false` and the public URL immediately returns 404
