# Dashboard

Route: `/`. Access: Signed in.

Provides a quick view of recent scoring, handicap, milestones, and goal progress.

## Entry points

- [DashboardPage.tsx](../../../frontend/src/pages/DashboardPage.tsx)
- [useDashboardViewModel.ts](../../../frontend/src/hooks/useDashboardViewModel.ts)
- [MobileDashboard.tsx](../../../frontend/src/components/dashboard/MobileDashboard.tsx)
- [DashboardDesktopLayout.tsx](../../../frontend/src/components/dashboard/DashboardDesktopLayout.tsx)

## How it works

The hook loads Dashboard data, recent analytics, user information, and the goal report through React Query. It derives chart series, recent averages, and accessible colors. The page handles loading/retry and passes a shared view model into mobile and desktop layouts.

## Boundaries and checks when changing it

Keep recent-window values distinct from lifetime achievements and handicap calculation history. A display slice must not redefine the underlying metric. Check no-rounds, failed requests/retry, optional statistics, and both layouts.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
