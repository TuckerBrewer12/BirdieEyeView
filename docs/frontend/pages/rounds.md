# Rounds

Route: `/rounds`. Access: Signed in.

Browses saved rounds with search, filters, sorting, progressive display, and course linking.

## Entry points

- [RoundsPage.tsx](../../../frontend/src/pages/RoundsPage/RoundsPage.tsx)
- [useRoundsPageViewModel.ts](../../../frontend/src/pages/RoundsPage/useRoundsPageViewModel.ts)
- [RoundsPage.screenshot.spec.ts](../../../frontend/src/pages/RoundsPage/tests/RoundsPage.screenshot.spec.ts)
- [RoundsPage.robot.ts](../../../frontend/src/pages/RoundsPage/tests/RoundsPage.robot.ts)

## How it works

The typed view-model hook queries rounds, owns filter/sort/link state, and updates the round cache after linking. The page composes brand controls and navigation. The current query fetches up to 100 rounds; Load more reveals additional already-fetched entries rather than requesting all history.

## Boundaries and checks when changing it

This is the current colocated page/view-model/robot example. Keep null-score ordering and filter behavior explicit. Check empty/populated lists, search/sort, linking errors, and light/dark mobile/desktop visuals.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
