# Daily Feature Plan — 2026-10-30

## Feature: Public Shareable Round URLs

**One-line description:** Let golfers share a round via a permanent, unauthenticated web link — so friends, caddies, or followers can view a scorecard without an account.

---

## User Value

Today, sharing a round produces a static PNG screenshot. That means no interactivity, no mobile responsiveness, no way for the recipient to tap a hole for details, and no discoverability for the app. A real link is shareable in iMessage, Instagram, Discord, or a group chat — every shared round becomes a growth touchpoint and a moment of social proof for the app.

Golfers already care about sharing rounds: the share button exists on both the scan success step and the round detail page, and a `ShareCard` SVG component was built specifically for this flow. This feature completes that intent with a proper web link instead of a flat image file.

---

## Technical Approach

### DB Migration — `013_add_round_share_token.sql`

```sql
ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS share_token  VARCHAR(32)  UNIQUE,
    ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN      NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_share_token
    ON users.rounds (share_token)
    WHERE share_token IS NOT NULL;
```

### Backend

**New file: `api/routers/share.py`**
- `POST /api/rounds/{round_id}/share` (auth required) — generates a `secrets.token_urlsafe(24)` token, sets `is_shareable=TRUE`, persists, returns `{ share_url }`.
- `DELETE /api/rounds/{round_id}/share` (auth required) — clears token, sets `is_shareable=FALSE`.
- `GET /api/rounds/public/{token}` (no auth) — returns a slim public payload: course name, date, tee, hole strokes + par_played, total score, to-par. Returns 404 if token not found or `is_shareable=FALSE`.

**Modify: `database/repositories/round_repo.py`**
- Add `set_share_token(round_id, token)` and `get_round_by_share_token(token)` methods.

**Modify: `api/main.py`**
- Register `share.router` with prefix `/api`.

**Modify: `api/request_models.py`** (or new `api/schemas_share.py`)
- `ShareRoundResponse` — `{ share_token: str, share_url: str }`
- `PublicRoundResponse` — lean schema with no PII: `course_name`, `round_date`, `tee_box`, `total_score`, `to_par`, `hole_scores[]`

### Frontend

**New page: `frontend/src/pages/PublicRoundPage.tsx`**
- Route: `/r/:token` (added to `App.tsx`)
- Fetches `GET /api/rounds/public/{token}`, unauthenticated.
- Renders a read-only scorecard using the existing `ShareCard` SVG grid (or a lightweight HTML version).
- Shows course name, date, score, to-par, and hole-by-hole score type badges.
- CTA at the bottom: "Track your own rounds → Sign up".

**Modify: `frontend/src/hooks/useShareRound.ts`**
- After generating the image share (current flow), also call `POST /api/rounds/{id}/share` to mint a token.
- Offer two share paths: **Copy link** (URL to clipboard + toast) and **Share image** (existing PNG flow).
- Cache the token in component state so repeat taps don't re-generate.

**Modify: `frontend/src/lib/api.ts`**
- Add `shareRound(roundId: string): Promise<ShareRoundResponse>`
- Add `unshareRound(roundId: string): Promise<void>`
- Add `getPublicRound(token: string): Promise<PublicRoundResponse>`

**Modify: `frontend/src/pages/RoundDetailPage.tsx`**
- Show a "Shared" badge + "Copy link" button when round has a token.
- Add "Unshare" action to revoke the link.

---

## Files to Change / Add

| Path | Action |
|---|---|
| `database/migrations/013_add_round_share_token.sql` | **New** |
| `database/repositories/round_repo.py` | Modify — add token CRUD |
| `api/routers/share.py` | **New** |
| `api/main.py` | Modify — register router |
| `api/request_models.py` | Modify — add share schemas |
| `frontend/src/pages/PublicRoundPage.tsx` | **New** |
| `frontend/src/App.tsx` | Modify — add `/r/:token` route (unauthenticated) |
| `frontend/src/lib/api.ts` | Modify — add share API calls |
| `frontend/src/hooks/useShareRound.ts` | Modify — mint URL, dual share paths |
| `frontend/src/pages/RoundDetailPage.tsx` | Modify — shared badge + unshare |

---

## Estimated Complexity

**Medium** — ~1–1.5 days of focused work. No new dependencies. The core risk is token lifecycle (revocation, regeneration on re-share) and ensuring the public endpoint leaks no PII (no user ID, email, or handicap in the public payload).

---

## Acceptance Criteria

- A golfer can tap "Share" on any saved round and receive both a copyable URL (`https://app.domain/r/<token>`) and the existing image share option.
- Visiting the URL without being logged in renders a read-only scorecard: course name, date, score, to-par summary, and per-hole score type badges.
- The round owner can revoke the link from the round detail page; after revocation the URL returns a 404 / "This scorecard is no longer shared" message.
- The public endpoint returns no user PII (no name, email, handicap index, or user ID).
- Re-tapping "Share" on a round that already has a token reuses the existing token instead of generating a new one.
