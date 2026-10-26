# Daily Feature Plan — 2026-10-26

## Feature: Shareable Round Link (Public Scorecard Page)

**One-line description:** Generate a unique public URL for any saved round so golfers can share their scorecard with anyone — no app required to view it.

---

## User Value

Right now, golfers scan a scorecard, save it, and then... it sits in the app. There's no way to tell a friend "I shot 78 today" and show them the actual scorecard. The `ShareCard` component (`frontend/src/components/share/ShareCard.tsx`) already renders a polished SVG scorecard with golf-native symbols (circles for birdies, squares for bogeys), but it's wired to nothing shareable.

A sharable link closes this loop:
- Post the link in a group chat, iMessage thread, or Instagram bio
- Friends see hole-by-hole scores with course name, date, and stats — no login, no app download
- Every shared link is passive app discovery (non-users see the product)
- Golfers are motivated to scan more rounds when sharing is a single tap away

---

## Technical Approach

### Database migration — `013_add_share_token_to_rounds.sql`

```sql
ALTER TABLE users.rounds
    ADD COLUMN share_token VARCHAR(32) UNIQUE;

CREATE UNIQUE INDEX idx_rounds_share_token ON users.rounds (share_token)
    WHERE share_token IS NOT NULL;
```

Share tokens are generated on demand (not at round creation), keeping the column null until a user explicitly generates a share link.

### Backend changes

**`database/repositories/round_repo.py`**
- Add `get_round_by_share_token(token: str) -> Optional[Round]` — public read, no auth
- Add `set_share_token(round_id: str, token: str) -> str` — generates and stores token

**`api/routers/rounds.py`**
- `POST /api/rounds/{id}/share` (authenticated) — generates a URL-safe random 24-char token if none exists, stores it, returns `{ share_url: "https://…/r/{token}" }`. Idempotent: returns existing token on repeat calls.
- `GET /api/rounds/public/{token}` (no auth) — returns round data safe to expose publicly (scores, course name, date, par, tee color, score type counts). Never returns user PII beyond first name.

**`api/schemas.py`** — add `PublicRoundResponse` schema (subset of Round: no user_id, no email)

### Frontend changes

**`frontend/src/pages/public/PublicRoundPage.tsx`** (new file)
- Route: `/r/:token` — public, no auth required
- Fetches `GET /api/rounds/public/{token}`
- Renders `ShareCard` full-width, plus stat summary row (total score, to-par, putts, GIR%)
- Shows course name + date in header; CTA "Track your rounds — Join ScanScorecards" at bottom
- Gracefully handles 404 (token not found) and loading state

**`frontend/src/components/round-detail/ShareButton.tsx`** (new file)
- Small button on `RoundDetailPage` ("Share Round") that calls `POST /api/rounds/{id}/share`, then copies the returned URL to clipboard and shows a "Link copied!" toast
- After first generation, shows a persistent "Shared" indicator with the link

**`frontend/src/lib/api.ts`**
- Add `shareRound(roundId: string): Promise<{ share_url: string }>`
- Add `getPublicRound(token: string): Promise<PublicRoundData>`

**`frontend/src/App.tsx`**
- Add route `<Route path="/r/:token" element={<PublicRoundPage />} />` outside the auth guard

---

## Estimated Complexity

**Medium**

- 1 DB migration (trivial ALTER TABLE)
- 2 new backend endpoints (~50 lines each)
- 2 new frontend files (public page + share button)
- 2 small additions to existing files (api.ts, App.tsx)
- ShareCard component already built — no chart work needed

No changes to auth, no new DB tables, no schema redesign. The hardest part is ensuring the public endpoint leaks no PII.

---

## Acceptance Criteria

- A golfer on `RoundDetailPage` can tap "Share Round" and receive a unique URL (e.g. `/r/abc123xyz`) copied to clipboard within 1 second.
- Visiting that URL in a browser **without being logged in** renders a full scorecard with hole scores, score type symbols, course name, date, and a summary stat row.
- Repeated taps on "Share Round" for the same round return the same URL (idempotent).
- The public endpoint never returns the user's email, UUID, or handicap index.
- A 404 page is shown for invalid or non-existent share tokens.
