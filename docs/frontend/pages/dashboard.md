# Dashboard

Route: `/`. Access: Signed in.

The golfer's home: the last round, the scoring average, the score mix, the best round, the goal and recent rounds.

## Entry points

- [DashboardPage.tsx](../../../frontend/src/pages/dashboard/DashboardPage.tsx)
- [useDashboardPageViewModel.ts](../../../frontend/src/pages/dashboard/useDashboardPageViewModel.ts)
- [dashboardRepository.ts](../../../frontend/src/pages/dashboard/dashboardRepository.ts)
- [present.ts](../../../frontend/src/pages/dashboard/present.ts)

## How it works

One request, `GET /api/stats/dashboard/{id}`, carries every figure: the last five rounds' average and its move against the last 20, the score mix, the handicap's move this month with its verdict, the best round, the four newest rounds (their holes carry `running_to_par` for the last round's line) and the last 20's trends. The repository maps it to domain types and the view model words it; the page only lays it out, wider on a computer and stacked on a phone. The handicap opens a sheet with the WHS breakdown.

## Boundaries and checks when changing it

The server owns the figures; the page formats and colours them and never recomputes them. A golfer with no rounds sees the empty state, not zeros. Check a golfer with one round, with only nine-hole rounds, and with no goal set.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
