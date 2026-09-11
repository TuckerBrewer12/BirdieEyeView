# Daily Feature Plan — 2026-09-11

## Feature: AI Improvement Coach Page

**One-line description:** A dedicated `/improve` page that surfaces Gemini-powered, personalized coaching suggestions telling golfers exactly what to work on next.

---

## User Value

Every golfer wants the same thing: a clear answer to "how do I get better?" The app already collects the data — rounds, hole scores, GIR, putting, scrambling — and there is already a backend endpoint (`GET /api/ai/{user_id}`) that calls Gemini with that data to generate personalized improvement suggestions. But there is no page in the UI that shows them. A golfer who opens the app today cannot access this feature at all.

Building this page closes a fully-built backend feature that is completely invisible to users. The AI suggestions are personalized, rate-limited (to keep quality high), and contextualized by the user's actual round history and scoring goal. For a golfer trying to break 90, seeing "Your three-putt rate from 8–15 feet is costing you ~2.1 strokes per round — the highest ROI fix available" is exactly what keeps them coming back.

---

## Technical Approach

### Backend (no new work needed)
The `GET /api/ai/{user_id}?limit=5&target_handicap={hi}` endpoint already exists in `api/routers/ai_insights.py` and is fully functional with rate limiting. No migrations required.

### Frontend changes

**New file: `frontend/src/pages/ImprovePage.tsx`**
- Main page component for the `/improve` route
- Calls `GET /api/ai/{user_id}?limit=5&target_handicap={handicapIndex}` via a new `getAIInsights(userId, limit, targetHandicap)` helper in `src/lib/api.ts`
- Renders a loading skeleton while fetching, then a stacked list of `AIInsightCard` components
- Shows a "Refresh" button with a rate-limit countdown timer when the limit is hit (parse the `Retry-After` header returned by the API on 429)
- Integrates the existing `GoalSaverCard` (from `src/components/goals/GoalSaverCard.tsx`) to cross-reference AI suggestions with goal savers below the AI section

**New file: `frontend/src/components/improve/AIInsightCard.tsx`**
- Renders one AI suggestion as a bento card matching the design system (`bg-white rounded-2xl border border-gray-100 shadow-sm`)
- Fields: `title`, `category` (badge: Putting / Short Game / Ball Striking / Course Management / Mental), `description`, `priority` (high/medium/low as a colored dot), optional `drill` text if the suggestion includes a specific drill
- Hover spring animation per design system: `whileHover={{ scale: 1.025 }}`

**New file: `frontend/src/components/improve/ImproveDesktopLayout.tsx`** (optional, if responsive split needed)
- Two-column layout at `lg:` breakpoint: AI suggestions on the left, goal savers on the right
- Single column on mobile stacked top-to-bottom

**Modified: `frontend/src/App.tsx`**
- Add route: `<Route path="/improve" element={<ImprovePage />} />`

**Modified: `frontend/src/components/layout/Sidebar.tsx`** and `frontend/src/components/layout/BottomNav.tsx`
- Add "Improve" nav item with a `Lightbulb` (or `Sparkles`) icon from Lucide React between "The Lab" and "Career"

**Modified: `frontend/src/lib/api.ts`**
- Add `getAIInsights(userId: string, limit?: number, targetHandicap?: number): Promise<AIInsight[]>`
- Add `AIInsight` type (or add to `src/types/analytics.ts`): `{ title: string; category: string; description: string; priority: 'high' | 'medium' | 'low'; drill?: string }`

**Modified: `frontend/src/pages/DashboardPage.tsx`**
- Add a small "AI Coach" teaser card in the bento grid (single-column, `md:col-span-1`) that shows the top suggestion with a "See all" link to `/improve`
- Only render if the user has ≥ 3 rounds (same gate the backend uses)

### Estimated scope
- 1 new page, 1–2 new components, 4 small file edits
- No DB migrations, no new backend routes
- Re-uses existing card system, framer-motion patterns, and Lucide icons already installed

---

## Estimated Complexity

**Medium** — backend is complete; this is a focused frontend build. The main work is the page + card component + nav wiring. Rate-limit UX (countdown timer) is the only mildly tricky part.

---

## Acceptance Criteria

- [ ] Navigating to `/improve` shows a list of AI-generated suggestions for the logged-in user, each rendered as a styled `AIInsightCard` with title, category badge, and description
- [ ] The page shows a loading skeleton while the API call is in flight and a user-friendly error state if the call fails
- [ ] When the rate limit is hit (HTTP 429), the page shows a "Next refresh available in X hours" message with a countdown rather than an error
- [ ] "Improve" appears in the sidebar (desktop) and bottom nav (mobile) with an appropriate icon, and is highlighted when the route is active
- [ ] The Dashboard page shows a teaser card for the top AI suggestion (for users with ≥ 3 rounds) that links to `/improve`
