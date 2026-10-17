# The Lab

Route: `/the-lab`. Access: Signed in.

Combines goal selection, improvement opportunities, and benchmark or friend comparisons.

## Entry points

- [TheLabPage.tsx](../../../frontend/src/pages/TheLabPage.tsx)
- [useLabViewModel.ts](../../../frontend/src/hooks/useLabViewModel.ts)
- [constants.ts](../../../frontend/src/components/the-lab/constants.ts)
- [LabDesktopLayout.tsx](../../../frontend/src/components/the-lab/LabDesktopLayout.tsx)
- [MobileLabPage.tsx](../../../frontend/src/components/the-lab/MobileLabPage.tsx)

## How it works

The hook loads the user, goal report, recent analytics, and friendships, with a conditional friend comparison query. A mutation updates the scoring goal and refreshes related state. Benchmark profiles and radar shaping support responsive layouts.

## Boundaries and checks when changing it

Local benchmark constants differ from AIService values; establish their intended cohort before consolidating them. Goal thresholds, round format, and estimated savings are domain contracts. Check goal-save errors, unavailable friend data, and both comparison modes.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
