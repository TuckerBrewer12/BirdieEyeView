# Analytics

Route: `/analytics` (`/the-lab` opens Profile). Access: Signed in.

Headline figures over five sections: Profile (the goal, the radar against a benchmark or a friend, where the strokes are, the peak game), Scoring, Ball striking, Putting and Approach.

## Entry points

- [AnalyticsPage.tsx](../../../frontend/src/pages/analytics/AnalyticsPage.tsx)
- [useAnalyticsPageViewModel.ts](../../../frontend/src/pages/analytics/useAnalyticsPageViewModel.ts)
- [useProfileViewModel.ts](../../../frontend/src/pages/analytics/useProfileViewModel.ts)
- [analyticsRepository.ts](../../../frontend/src/pages/analytics/analyticsRepository.ts)
- [useBenchmarkComparison.ts](../../../frontend/src/pages/analytics/useBenchmarkComparison.ts)

## How it works

`GET /api/stats/analytics/{user}` sends a typed `AnalyticsResponse`: the headline with moves and lines, per-round trends, breakdowns and the page's marks. Profile reads it at limit 20 with the goal report and `GET /api/stats/{id}/benchmark`. Sections sit under a `TabBar`; the tab is in the URL.

## Boundaries and checks when changing it

Benchmarks, verdicts and marks come from the server; only the radar's drawing scale is client-side (`domain/radar.ts`). Check a golfer under five rounds (no moves), no goal, and a friend comparison.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
