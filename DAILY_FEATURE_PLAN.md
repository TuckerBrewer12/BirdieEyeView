# Daily Feature Plan — 2026-10-12

## Feature: Public Shareable Round Links

**One-line description:** Generate a unique URL for any saved round so golfers can share their scorecard with anyone — even non-users — via a beautiful, read-only public page.

---

## User Value

When a golfer scans a scorecard and saves a round, the current experience lets them export a PNG image via the native share sheet. That's useful for Instagram stories or iMessage, but it's a dead end — the image can't be tapped, linked, or discovered by other golfers.

A shareable URL changes the story:
- **Virality:** A non-user friend clicks the link, sees a gorgeous scorecard summary, and discovers the app.
- **Persistence:** The link works forever in group chats, golf league emails, or Twitter/X posts.
- **Golf culture fit:** Golfers love bragging about a good round — a link is more credible and shareable than a PNG.

The `ShareCard` component is already designed (color-coded hole grid, score chips, putting/GIR stats, dark header). This feature simply gives it a URL home.

---

## Technical Approach

### 1. Database migration — `database/migrations/013_add_round_share_token.sql`

```sql
ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_share_token
    ON users.rounds (share_token) WHERE share_token IS NOT NULL;
```

### 2. Backend — new public router `api/routers/public_rounds.py`

- `POST /api/rounds/{round_id}/share` (auth required)
  - Generates a `uuid4()` share token, stores it on the round row.
  - Returns `{ "share_url": "https://<host>/public/rounds/<token>" }`.
  - Idempotent: if a token already exists, returns the existing URL.
- `DELETE /api/rounds/{round_id}/share` (auth required)
  - Sets `share_token = NULL` to revoke the public link.
- `GET /api/public/rounds/{share_token}` (no auth)
  - Looks up round by `share_token`. Returns a safe public subset:
    - `course_name`, `date`, `tee_box`, `total_score`, `to_par`, `hole_scores[]` (strokes + par_played only), `score_type_counts`, `total_putts`, `total_gir`.
  - Excludes user identity (returns `"golfer": null` or first name only if the user opts in later).
  - Raises 404 if token not found or share is revoked.

Mount in `api/main.py`:
```python
from api.routers.public_rounds import router as public_rounds_router
app.include_router(public_rounds_router, prefix="/api")
```

### 3. Database layer — `database/repositories/round_repo.py`

- Add `set_share_token(round_id, token)` and `get_round_by_share_token(token)` methods.
- `get_round_by_share_token` reuses the existing row→model converters with a filtered field set.

### 4. Frontend API client — `frontend/src/lib/api.ts`

```ts
shareRound: (roundId: string) =>
  postJSON<{ share_url: string }>(`/rounds/${roundId}/share`, {}),
unshareRound: (roundId: string) =>
  deleteJSON<void>(`/rounds/${roundId}/share`),
getPublicRound: (shareToken: string) =>
  fetchJSON<PublicRound>(`/public/rounds/${shareToken}`),
```

Add `PublicRound` type to `frontend/src/types/golf.ts`.

### 5. Frontend public page — `frontend/src/pages/public/PublicRoundPage.tsx`

- Route: `/public/rounds/:shareToken` (unauthenticated, added to `App.tsx` outside the auth guard).
- Fetches via `api.getPublicRound(shareToken)`.
- Renders the existing `ShareCard` component directly (no layout chrome, no sidebar).
- Shows a "Track your own rounds →" CTA button pointing to `/register`.
- 404 state: "This scorecard link has expired or been removed."

### 6. Share UX — `frontend/src/hooks/useShareRound.ts`

Update `share()` to offer two actions:
- **Copy link** — calls `api.shareRound(roundId)` and copies the URL to clipboard. Toast: "Link copied!"
- **Export image** — existing `html-to-image` flow.

Update share button in `ScanSuccessStep.tsx` and `RoundDetailPage.tsx` to show a small dropdown or two-button split (link icon + image icon).

### 7. Revoke link — `frontend/src/pages/RoundDetailPage.tsx`

Add a small "Revoke share link" option in the round's overflow menu (shown only when a share token exists, fetched as part of the round detail response after adding `share_token: string | null` to the API response model).

---

## Estimated Complexity: **Medium**

- DB migration: trivial (one column + one index).
- Backend: ~150 lines across two new files + repo additions.
- Frontend: ~200 lines (new page + hook update + button changes).
- No new dependencies needed.
- No auth changes; the public endpoint is intentionally unauthenticated.

---

## Acceptance Criteria

- [ ] `POST /api/rounds/{id}/share` returns a `share_url` and stores a token; calling it again returns the same URL.
- [ ] `GET /api/public/rounds/{token}` returns round data (course, date, hole scores, totals) without requiring a session cookie; responds 404 for unknown or revoked tokens.
- [ ] `/public/rounds/:token` renders the `ShareCard` UI in a standalone page (no sidebar/nav), visible when logged out.
- [ ] The share button in `RoundDetailPage` and `ScanSuccessStep` offers a "Copy link" action that copies the public URL to the clipboard and shows a toast confirmation.
- [ ] Revoking a share link via `DELETE /api/rounds/{id}/share` causes subsequent GETs to the old token URL to return 404.
