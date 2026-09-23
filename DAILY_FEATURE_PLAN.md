# Daily Feature Plan — 2026-09-23

## Feature: AI Insights Page ("Your Coach")

**One-line description:** A dedicated frontend page that surfaces the fully-built AI coaching engine to users — showing personalized improvement areas, strengths, and handicap-range benchmarks with drill tips.

---

## User Value

The app already scans scorecards, saves rounds, and computes analytics — but it doesn't yet tell the golfer *what to do next*. The AI insights engine benchmarks every tracked stat (GIR, putting, scrambling, par-type scoring) against players in the same handicap range and ranks the highest-ROI areas to improve.

Right now this engine runs but its output is invisible. Surfacing it creates the app's most compelling "aha" moment: a first-time visitor who scans three rounds comes back to see personalized coaching they couldn't get from a notepad. It's the clearest differentiator from a paper scorecard.

---

## What's Already Built (Backend — needs zero changes)

- `GET /api/ai-insights/:user_id?limit=&target_handicap=` — fully implemented in `api/routers/ai_insights.py`
- `services/ai_service.py` — rule-based engine with handicap-range benchmarks (6 tiers: Scratch → 28–54 HCP)
- Rate limiting: 12 req/hr per IP, 20 req/hr per user (sliding window, `Retry-After` header)
- Response schema (`api/schemas.py`):
  - `insights: AIInsightItem[]` — ranked weaknesses with `priority_score`, `drill_tips[]`, `what_if`, `trend_direction`
  - `strengths: AIStrengthItem[]` — what the player does well vs. peers
  - `comparisons: AIComparisonItem[]` — raw metric vs. benchmark table (GIR %, putts/round, scrambling %, etc.)
  - `rounds_analyzed`, `handicap_range_label`, `generated_at`

---

## Technical Approach

### New files

| File | Purpose |
|---|---|
| `frontend/src/pages/AIInsightsPage.tsx` | Main page component |
| `frontend/src/components/ai-insights/InsightCard.tsx` | Card for one `AIInsightItem` — priority badge, title, description, drill tips, trend arrow, what-if |
| `frontend/src/components/ai-insights/StrengthCard.tsx` | Card for one `AIStrengthItem` — margin description + sparkline bar vs benchmark |
| `frontend/src/components/ai-insights/ComparisonTable.tsx` | Grouped table/grid (Ball Striking / Short Game / Putting) of `AIComparisonItem` rows |
| `frontend/src/components/ai-insights/HandicapRangeChip.tsx` | Pill showing `handicap_range_label` and rounds analyzed |

### Files to modify

| File | Change |
|---|---|
| `frontend/src/App.tsx` | Add `/ai-insights` route → `AIInsightsPage` |
| `frontend/src/lib/api.ts` | Add `getAIInsights(userId, opts?)` function |
| `frontend/src/types/analytics.ts` | Add `AISuggestionsResponse`, `AIInsightItem`, `AIStrengthItem`, `AIComparisonItem` TypeScript types |
| `frontend/src/pages/TheLabPage.tsx` | Add "AI Coach" entry-point card/button linking to `/ai-insights` |
| `frontend/src/components/layout/Sidebar.tsx` (or nav) | Add "AI Coach" nav item with a sparkle/brain icon |

### No DB migrations needed
The backend is complete. No schema changes.

### UX flow

1. User navigates to `/ai-insights` (or taps "AI Coach" in TheLabPage / sidebar)
2. Page fetches `GET /api/ai-insights/:userId` on mount
3. Loading state: skeleton cards (3 insight + 2 strength + 1 comparison)
4. On success: render three sections in scroll order:
   - **Top Priorities** — `insights` sorted by `priority_score` desc, top 3–5 shown; each card has a colored priority badge (🔴 high / 🟡 medium / 🟢 low), trend arrow, `what_if` callout, collapsible `drill_tips`
   - **Your Strengths** — `strengths` as a 2-col bento grid
   - **How You Compare** — `comparisons` grouped by `category` in a compact table; cells colored green/red if player beats/trails benchmark
5. Rate-limit error (429): show "refresh available at HH:MM" countdown using `Retry-After` header
6. `rounds_analyzed < 3`: show "Scan more rounds to unlock deeper insights" empty state with link to `/scan`

### Design system notes (per CLAUDE.md)
- Cards: `bg-white rounded-2xl border border-gray-100 shadow-sm p-5`
- Priority badge colors: high → `#ef4444`, medium → `#f59e0b`, low → `#059669` (matches score-type semantic palette)
- Trend arrows: emerald up = improving, red down = declining, gray = stable
- Section backgrounds: alternate the existing gradient tints (scoring green → putting blue → short-game purple)
- Framer-motion scroll entrance on each card (`ScrollSection` pattern)

---

## Estimated Complexity

**Medium** — ~400–600 lines of new frontend code across 5–7 files. No backend work. No DB migration. Mostly wiring an existing API to purpose-built display components following the established design system.

---

## Acceptance Criteria

- [ ] Navigating to `/ai-insights` renders the page; the API call fires and insights load within the existing auth session (no extra login step).
- [ ] `insights` cards display `priority_score` badge, `trend_direction` arrow, `what_if` text, and at least the first `drill_tip` (remainder collapsible).
- [ ] `comparisons` table groups metrics by `category` and uses green/red cell tinting to indicate above/below benchmark.
- [ ] A 429 rate-limit response shows a human-readable "Try again at HH:MM" message rather than a raw error.
- [ ] When `rounds_analyzed < 3`, an empty-state prompt with a "Scan a round" CTA replaces the insight cards.
