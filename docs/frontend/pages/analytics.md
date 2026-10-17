# Analytics

Route: `/analytics`. Access: Signed in.

Explores scoring, putting, GIR, distributions, yardage patterns, and trends with filters.

## Entry points

- [AnalyticsPage.tsx](../../../frontend/src/pages/AnalyticsPage.tsx)
- [useAnalyticsViewModel.ts](../../../frontend/src/hooks/useAnalyticsViewModel.ts)
- [MobileAnalyticsPage.tsx](../../../frontend/src/components/analytics/MobileAnalyticsPage.tsx)
- [AnalyticsDesktopLayout.tsx](../../../frontend/src/components/analytics/AnalyticsDesktopLayout.tsx)

## How it works

The hook queries filtered analytics, played courses, and user context, then derives rolling series, colors, and narrative cards. The page handles loading/empty results and sends one view model to responsive layouts. computeInsights() generates local narrative cards from analytics data.

## Boundaries and checks when changing it

Those local cards are not proof that services/ai_service.py is called. Keep filters in query keys, preserve missing-data gaps, and distinguish an empty filtered result from a new account. Numerical fixes must coordinate the backend metric contracts.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
