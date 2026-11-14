# Round detail

Route: `/rounds/:roundId`. Access: Signed in.

One round: its summary, scorecard, the round flow, "vs your average", and editing, linking, sharing and deleting it.

## Entry points

- [RoundDetailPage.tsx](../../../frontend/src/pages/rounds/round-details/RoundDetailPage.tsx)
- [useRoundDetailPageViewModel.ts](../../../frontend/src/pages/rounds/round-details/useRoundDetailPageViewModel.ts)
- [useRoundEditorViewModel.ts](../../../frontend/src/pages/rounds/round-details/useRoundEditorViewModel.ts)
- [roundEditorModel.ts](../../../frontend/src/pages/rounds/round-details/roundEditorModel.ts)
- [RoundActions.tsx](../../../frontend/src/pages/rounds/round-details/RoundActions.tsx)

## How it works

`GET /api/rounds/{id}` sends the round with every figure the `Round` model works out, plus the golfer's course handicap and net score. The comparison reads `GET /api/stats/compare/{user}/{round}` (last 5, last 20, all, each figure with a verdict). Editing keeps live totals through `Round.previewEdits` until the saved response replaces them. Share draws `RoundShareCard` to a PNG.

## Boundaries and checks when changing it

Edits preview with the server's rules and are replaced by the saved round. Check an unlinked round, a nine, a round with no putts, editing the tee, and delete's confirmation.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
