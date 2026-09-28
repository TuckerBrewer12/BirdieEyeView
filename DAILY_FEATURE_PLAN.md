# Daily Feature Plan — 2026-09-28

## Feature: Shareable Round Links

**One-line description:** Let any golfer share a permanent public URL to any saved round — friends and followers can view the full scorecard without logging in.

---

## User Value

Golfers love showing off good rounds. Right now, the only sharing option is `useShareRound`, which exports a static PNG for the native OS share sheet. Once that image is sent it's a dead end: there's no link, no context, and no way to bring someone back to the app.

A shareable link (`app.com/r/abc123`) changes the experience:

- **Virality:** every good round becomes a mini landing page that non-users can view, with a prompt to sign up and scan their own.
- **Social currency:** golfers already text scorecards to each other — now they can send a live, interactive card instead of a flat photo.
- **Closes the social loop:** the friends system and inbox are built but have no round content to flow through them. This gives friends something to react to.

---

## Technical Approach

### 1. Database migration (`database/migrations/013_add_round_share_token.sql`)

```sql
ALTER TABLE users.rounds
    ADD COLUMN share_token UUID UNIQUE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_rounds_share_token
    ON users.rounds (share_token)
    WHERE share_token IS NOT NULL;
```

- Token is `NULL` by default (private). Generated on demand — not auto-created for every round.
- UUID4 provides sufficient entropy; no sequential guessing.

### 2. Backend

**`database/repositories/round_repo.py`** — two new methods:
- `set_share_token(round_id, user_id) -> str` — generates `uuid4()`, sets it, returns the token.
- `revoke_share_token(round_id, user_id)` — sets `share_token = NULL`.
- `get_round_by_share_token(token) -> Round | None` — no auth check, read-only.

**`api/routers/rounds.py`** — three new endpoints:
```
POST   /api/rounds/{id}/share         → { share_token, share_url }  (auth required, owner only)
DELETE /api/rounds/{id}/share         → 204                          (auth required, revoke)
GET    /api/public/rounds/{token}     → RoundPublicResponse           (no auth required)
```

`RoundPublicResponse` (in `api/schemas.py`) includes: `course_name`, `round_date`, `tee_box`, `total_score`, `to_par`, `hole_scores` (strokes + par_played only — no PII), `score_type_counts`.

**`api/main.py`** — register `/api/public` router (unauthenticated prefix).

### 3. Frontend

**`src/lib/api.ts`** — three new API calls:
- `shareRound(roundId)` → `{ share_token, share_url }`
- `revokeShare(roundId)` → `void`
- `getPublicRound(token)` → `RoundPublicData`

**`src/pages/RoundDetailPage.tsx`** — add share button in the header actions row:
- If round has no share link: "Share" button → calls `shareRound`, copies URL to clipboard, shows toast.
- If round already shared: shows "Shared" badge with copy icon + "Revoke" option.

**`src/pages/share/SharedRoundPage.tsx`** *(new file)* — public page at `/r/:token`:
- Uses `useQuery` to fetch `getPublicRound(token)`.
- Renders a read-only scorecard using the existing `<ShareCard>` component (already in `src/components/share/ShareCard.tsx`).
- Below the scorecard: CTA banner — "Track your own rounds → Sign up free."
- No auth context required.

**`src/App.tsx`** — add public route:
```tsx
<Route path="/r/:token" element={<SharedRoundPage />} />
```
This route sits outside the auth-guarded layout so it loads without a session.

### 4. Files to change / create

| File | Change |
|---|---|
| `database/migrations/013_add_round_share_token.sql` | New migration |
| `database/repositories/round_repo.py` | 3 new methods |
| `database/schema.sql` | Add `share_token` column documentation |
| `api/routers/rounds.py` | 3 new endpoints |
| `api/schemas.py` | `RoundPublicResponse` model |
| `api/main.py` | Register public router prefix |
| `src/lib/api.ts` | 3 new API functions |
| `src/pages/RoundDetailPage.tsx` | Share/revoke button in header |
| `src/pages/share/SharedRoundPage.tsx` | New public page |
| `src/App.tsx` | Public route `/r/:token` |

---

## Estimated Complexity

**Medium** (~1–2 days of focused work)

- No new infrastructure or external dependencies.
- Migration is trivial (one nullable column + index).
- `ShareCard` component already exists and renders correctly.
- The main effort is the public route (unauthenticated layout) and wiring revoke/state management in `RoundDetailPage`.

---

## Acceptance Criteria

- [ ] `POST /api/rounds/{id}/share` returns a `share_url` and stores a `share_token` on the round; calling it twice on the same round returns the same token.
- [ ] `GET /api/public/rounds/{token}` returns full hole-by-hole scorecard data with no authentication header required.
- [ ] `/r/{token}` renders the scorecard in a browser with no login prompt; includes a sign-up CTA.
- [ ] `DELETE /api/rounds/{id}/share` nullifies the token; the public URL immediately returns 404.
- [ ] Share button in `RoundDetailPage` copies the share URL to clipboard and shows a success toast; repeated clicks reveal a "Revoke" option.
