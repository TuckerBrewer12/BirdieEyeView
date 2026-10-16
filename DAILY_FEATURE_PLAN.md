# Daily Feature Plan — 2026-10-16

## Feature: Public Round Share Links

**One-line description:** Generate a shareable URL for any round so golfers can send friends a beautiful public scorecard view — no login required.

---

## User Value

Golfers already love bragging about a great round. The app has a polished `ShareCard` that exports an image, but sharing is currently limited to an image download or native share API. A real shareable URL closes the social loop:

- A golfer finishes a 79 and wants to show their golf buddy — they tap "Copy Link," paste it into iMessage, and the friend sees the full scorecard, score type breakdown, and stats in any browser, instantly.
- Every shared link is passive user acquisition — non-users who open the link see the app brand, and a "Try ScanScorecards" CTA drives sign-ups.
- Friend groups can compare rounds without everyone needing to be in the app or logged in.

This builds on three things already in place: the `ShareCard` visual component, the auth/social infrastructure, and the round detail page.

---

## Technical Approach

### Database Migration (`database/migrations/004_round_share_token.sql`)
```sql
-- Add a nullable share token to rounds; generated on-demand (not for every round by default)
ALTER TABLE users.rounds ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE;
CREATE INDEX IF NOT EXISTS idx_rounds_share_token ON users.rounds (share_token) WHERE share_token IS NOT NULL;
```

### Backend

**New endpoint in `api/routers/rounds.py`:**
- `POST /api/rounds/{id}/share` — authenticated; generates a `share_token` (UUID) if one doesn't exist, updates the row, returns `{ share_url: "..." }`. Idempotent — calling again returns the same token.
- `DELETE /api/rounds/{id}/share` — authenticated; sets `share_token = NULL` (revokes the link).
- `GET /api/rounds/share/{token}` — **unauthenticated**; returns a limited public view of the round: `{ course_name, date, total_score, tee_box, hole_scores, course (holes/par only), tee (ratings/yardages), stats summary }`. No user PII beyond display name (optional). Returns 404 if token not found.

**Changes to `api/routers/rounds.py`:**
- Add three new route handlers (share, revoke, public view).
- Add `share_token` to `UpdateRoundRequest` response schema.

**Changes to `database/repositories/round_repo.py`:**
- `generate_share_token(round_id)` — sets `share_token = gen_random_uuid()` if null, returns it.
- `revoke_share_token(round_id)` — sets `share_token = NULL`.
- `get_round_by_share_token(token)` — public fetch; returns round + course data, no auth check.

**`api/request_models.py`:** Add `PublicRoundResponse` Pydantic model.

### Frontend

**New public page `frontend/src/pages/public/PublicRoundPage.tsx`:**
- Route: `/share/:token` (added to public routes in `App.tsx` — no auth required).
- Renders the `ShareCard` component (already built) in a centered layout with a header matching the app brand.
- Below the card: "Track your own rounds with ScanScorecards" CTA button → `/register`.
- Handles 404 gracefully: "This scorecard link has expired or been removed."

**Modified `frontend/src/pages/RoundDetailPage.tsx`:**
- New "Share Link" button in the header actions area (alongside the existing image-share button).
- On click: calls `POST /api/rounds/{id}/share`, copies the resulting URL to clipboard, shows a brief "Link copied!" toast.
- If a `share_token` already exists on the round, show a "Copy Link" button directly (no extra API call needed).
- Optional "Revoke Link" in round settings/overflow menu.

**`frontend/src/lib/api.ts`:**
- `shareRound(roundId: string): Promise<{ share_url: string }>` — POST to share endpoint.
- `getPublicRound(token: string): Promise<PublicRound>` — GET from public endpoint.

### App.tsx
- Add `/share/:token` to the public route list (no redirect to login).
- Render `<PublicRoundPage />` for that route (no `AppLayout` wrapper needed — standalone page).

---

## Estimated Complexity

**Medium** — ~1 day of focused work.

- DB migration: trivial (1 column, 1 index).
- Backend: ~3 new route handlers + 3 repo methods (~100 lines Python).
- Frontend: 1 new page component + minor edits to 3 existing files (~200 lines TypeScript/TSX).
- No new dependencies needed (`crypto.randomUUID` for the frontend clipboard flow; `uuid` already used backend-side).

---

## Acceptance Criteria

- [ ] A logged-in user can tap "Share Link" on any round detail page and have a URL copied to their clipboard (format: `https://<app>/share/<uuid>`).
- [ ] Visiting that URL in any browser — logged in or not — renders a full scorecard view using the existing `ShareCard` visual design, plus the course name, date, tee info, and a score-type breakdown.
- [ ] The public page has zero auth gates: no redirect to login, no sign-in prompt blocking the view.
- [ ] A "Try ScanScorecards" CTA appears below the card for unauthenticated visitors, linking to `/register`.
- [ ] The round owner can revoke the link (via overflow menu), after which the URL returns a 404 and "This scorecard is no longer shared."
