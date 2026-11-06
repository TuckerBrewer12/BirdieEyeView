# Career

Route: `/career`. Access: Signed in.

Shows achievements, milestones, personal bests, and longer-term player history.

## Entry points

- [CareerPage.tsx](../../../frontend/src/pages/CareerPage.tsx)
- [useCareerViewModel.ts](../../../frontend/src/hooks/useCareerViewModel.ts)
- [MobileCareerPage.tsx](../../../frontend/src/components/analytics/MobileCareerPage.tsx)
- [CareerDesktopLayout.tsx](../../../frontend/src/components/analytics/CareerDesktopLayout.tsx)

## How it works

The hook loads analytics and derives milestone/event presentation, score mixes, and chart colors. CareerPage handles loading/missing data and passes the result to mobile and desktop layouts. Its current analytics query requests up to 200 rounds.

## Boundaries and checks when changing it

A larger fixed window is still not all-history coverage. Do not label a window-derived first/best event as lifetime truth without the backend contract. Preserve event identity/dates, unknown values, and consistent milestone thresholds.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
