# Daily Feature Plan — 2026-10-05

## Feature: Public Round Share Links

**One-line description:** Generate a shareable public URL for any round that renders a beautiful scorecard preview — no login required to view.

---

## User Value

Golfers are inherently social and love showing off (or commiserating over) their rounds. Right now there's no way to share a round from ScanScorecards outside the app. A public share link lets a user text a friend "I just broke 80!" with a link to a real visual scorecard, post it to Instagram stories, or drop it in a group chat.

This is also the app's most powerful free growth mechanic: every shared round is an ad for ScanScorecards with a built-in CTA.

**The `ShareCard.tsx` SVG component already exists and is production-quality** — it renders the traditional golf scorecard format with per-hole score symbols (eagle circles, birdie circles, bogey squares, etc.). The work remaining is the plumbing: a share token, a public API endpoint, and a public-facing React route.

---

## Technical Approach

### 1. Database Migration — `database/migrations/004_share_tokens.sql`

```sql
ALTER TABLE users.rounds
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(32) UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_share_token
  ON users.rounds (share_token) WHERE share_token IS NOT NULL;
```

Token is a 32-char hex string (16 random bytes), generated on demand (lazy — only created when the user first clicks "Share").

### 2. Backend — `api/routers/rounds.py`

Add two endpoints:

**`POST /api/rounds/{round_id}/share`** (authenticated)
- Requires the round to belong to the calling user.
- If `share_token` is already set, returns it; otherwise generates `secrets.token_hex(16)`, saves it, returns `{ share_url: "https://…/s/{token}" }`.

**`GET /api/share/{token}`** (public — no auth)
- Looks up round by `share_token`.
- Returns a public-safe round payload: scores, total, course name, date, tee box. **Omits** user PII.
- Returns 404 if token not found or round has been deleted.

Add `revoke` endpoint optionally: `DELETE /api/rounds/{round_id}/share` to null out the token.

### 3. Database — `database/repositories/round_repo.py`

- `get_round_by_share_token(token: str) -> Optional[Round]` — new method
- `set_share_token(round_id: UUID, token: str | None)` — new method
- Update `get_round_by_id` converter to include `share_token` in response for the owner.

### 4. Frontend — New Public Route

**`frontend/src/pages/public/SharedRoundPage.tsx`** — new file
- Fetches `/api/share/:token` (no auth header).
- Renders `<ShareCard round={...} courseName={...} />` (already built in `src/components/share/ShareCard.tsx`).
- Shows course name, date, total score, tee box.
- Includes a subtle CTA: "Track your rounds at ScanScorecards →" linking to landing page.
- Handles 404 gracefully ("This scorecard is no longer available").

**`frontend/src/App.tsx`** — add public route (no auth guard):
```tsx
<Route path="/s/:token" element={<SharedRoundPage />} />
```
This route must be reachable without login — add `/s/` to the `isPublicRoute` check.

### 5. Frontend — Share Button in Round Detail

**`frontend/src/pages/RoundDetailPage.tsx`**
- Add a "Share" button (icon: `Share2` from lucide-react) in the round header action row.
- On click: `POST /api/rounds/{id}/share` → receive URL → copy to clipboard + show toast "Link copied!".
- If share link already exists, show it and offer "Revoke link" option.
- Loading/error states.

### 6. Open Graph Meta Tags (optional enhancement)

In `SharedRoundPage.tsx`, use `react-helmet-async` (or `<title>` + `<meta>` in the document head) to set:
- `og:title`: "Tucker's round at Pebble Beach — 78 (+6)"
- `og:description`: "18 holes · White tees · 2 birdies, 12 pars"
- `og:image`: a static preview image or the rendered SVG exported as PNG via a server-side endpoint (phase 2)

---

## Estimated Complexity

**Medium**

- DB migration: trivial (one `ALTER TABLE`, one index)
- Two new API endpoints: ~60 lines of Python
- One new public React page: ~80 lines
- RoundDetailPage share button: ~40 lines
- No new infrastructure, no new dependencies
- ShareCard.tsx is already done — this is pure plumbing

Realistic build time: **4–6 hours** end-to-end including tests.

---

## Acceptance Criteria

- [ ] A logged-in user can click "Share" on any round and receive a copyable URL (e.g. `https://app.scanscorecards.com/s/a3f8...`).
- [ ] Visiting the share URL without being logged in shows the full scorecard (via `ShareCard.tsx`) with course name, date, and total score.
- [ ] The public endpoint returns 404 for unknown or revoked tokens; the React page shows a graceful "not found" message.
- [ ] The share token is generated lazily (only on first share action) and is stable — sharing the same round twice returns the same URL.
- [ ] A user can revoke the link from RoundDetailPage, after which the URL returns 404 for anyone who tries to visit it.
