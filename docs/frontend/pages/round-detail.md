# Round detail

Route: `/rounds/:roundId`. Access: Signed in.

Displays a saved scorecard with comparisons, editing, sharing, deletion, and course association.

## Entry points

- [RoundDetailPage.tsx](../../../frontend/src/pages/RoundDetailPage.tsx)
- [ScorecardGrid.tsx](../../../frontend/src/components/round-detail/ScorecardGrid.tsx)
- [useRoundHoles.ts](../../../frontend/src/hooks/useRoundHoles.ts)
- [useShareRound.ts](../../../frontend/src/hooks/useShareRound.ts)

## How it works

The page reads the route ID, queries the round/comparison/handicap context, and owns editing and action state. It sends accepted edits and course links through API helpers and reconciles cached data. Scorecard and sharing components render the resulting round.

## Boundaries and checks when changing it

This page still contains substantial orchestration rather than a dedicated page view-model. Preserve edit cancellation, omitted versus cleared values, historical per-hole par, duplicate-submit protection, and save/delete error recovery during extraction into hooks.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
