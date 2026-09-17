# Daily Feature Plan — 2026-09-17

## Feature: Public Round Share Links

**One-line description:** Let golfers generate a permanent public URL for any saved round so they can share their scorecard with anyone — no account required to view.

---

## User Value

Golf is inherently social. Golfers want to celebrate a great round, trash-talk their buddies, or show a coach their card. Right now the app is a closed silo — there is no way to share a round with someone who isn't a friend in the app, or with someone who doesn't have an account at all.

The `ShareCard` component (`frontend/src/components/share/ShareCard.tsx`) is already fully built: it renders a beautiful 390px scorecard image with hole-by-hole symbols, score-type chips, GIR/putts tiles, and the BirdieEyeView branding. The only thing missing is a public URL backed by a backend token.

Every shared scorecard is also organic marketing — the first thing a recipient sees is the app's branding and a "Log your own rounds" CTA.

---

## Technical Approach

### 1. Database migration — `database/migrations/004_share_tokens.sql`

```sql
ALTER TABLE users.rounds
  ADD COLUMN share_token VARCHAR(32) UNIQUE;

CREATE UNIQUE INDEX idx_rounds_share_token
  ON users.rounds (share_token)
  WHERE share_token IS NOT NULL;
```

No new tables needed. Tokens are `NULL` by default (opt-in, not generated until the user clicks Share).

### 2. Backend — two new endpoints in `api/routers/rounds.py`

**`POST /api/rounds/{id}/share`** (authenticated, owner only)
- If `share_token` is already set, return it (idempotent).
- Otherwise generate `secrets.token_urlsafe(24)` → write to DB → return `{"share_token": "…", "share_url": "…"}`.
- Also add `DELETE /api/rounds/{id}/share` to revoke the token (sets it back to `NULL`).

**`GET /api/rounds/public/{token}`** (unauthenticated)
- Looks up round by `share_token`.
- Returns a safe public payload: course name, date, tee box, total score, to-par, hole scores (strokes + par_played), GIR, putts, score-type counts, and first name of the player.
- Returns 404 if token is unknown or round has been deleted.
- No PII beyond first name; no email, handicap, or personal stats.

New Pydantic response model `PublicRoundResponse` in `api/request_models.py`.

### 3. Frontend — new page `frontend/src/pages/SharePage.tsx`

- Route: `/share/:token` (public, no auth guard in `App.tsx`).
- Fetches `GET /api/rounds/public/:token` on mount (no auth header).
- Renders the existing `ShareCard` component with the fetched data.
- "Download as Image" button using `html2canvas` (capture the `ShareCard` ref → trigger browser download).
- "Log your own rounds →" CTA linking to `/register`.
- Minimal layout: dark green header strip (matches ShareCard branding), centered card, footer CTA. No sidebar/nav — fully public.

### 4. Frontend — Share button in `RoundDetailPage.tsx`

- Add a `Share` button in `RoundDetailHeader` (or the page's action row).
- On click: `POST /api/rounds/{id}/share` → copy URL to clipboard + show a brief "Link copied!" toast.
- Show the existing share URL and a Revoke link if a token already exists.

### 5. Files to create/modify

| File | Change |
|---|---|
| `database/migrations/004_share_tokens.sql` | New — adds `share_token` column + index |
| `database/repositories/round_repo.py` | Add `set_share_token()`, `get_round_by_share_token()`, `revoke_share_token()` |
| `api/routers/rounds.py` | Add `POST /rounds/{id}/share`, `DELETE /rounds/{id}/share`, `GET /rounds/public/{token}` |
| `api/request_models.py` | Add `PublicRoundResponse` |
| `frontend/src/lib/api.ts` | Add `shareRound(id)`, `revokeShare(id)`, `getPublicRound(token)` |
| `frontend/src/pages/SharePage.tsx` | New public page |
| `frontend/src/App.tsx` | Add `/share/:token` route (no auth guard) |
| `frontend/src/components/round-detail/RoundDetailHeader.tsx` | Add Share / Revoke button + copy-link toast |

### 6. No new dependencies needed

- `html2canvas` is implied by the existing `ShareCard` `forwardRef` pattern; confirm it's in `package.json` or add it.
- All other pieces use existing libraries (React Router, Tailwind, fetch).

---

## Estimated Complexity

**Medium** — roughly 1–2 days of focused work.

- Backend: ~150 lines (two endpoints + repo methods + migration).
- Frontend: ~200 lines (SharePage + button + api client additions).
- The heavy UI work (`ShareCard`) is already done — this is plumbing and routing.

---

## Acceptance Criteria

- [ ] A logged-in user can click "Share" on any of their saved rounds and receive a unique public URL (copied to clipboard automatically).
- [ ] Opening the public URL in a browser with no account or session renders the full scorecard (ShareCard layout) with course, date, scores, GIR, and putts — no login required.
- [ ] The public endpoint returns 404 for unknown or revoked tokens; no round data leaks through error messages.
- [ ] The user can revoke the share link from the round detail page, after which the old URL returns 404.
- [ ] The SharePage includes a "Log your own rounds" CTA linking to the registration page, and carries BirdieEyeView branding consistent with the ShareCard design.
