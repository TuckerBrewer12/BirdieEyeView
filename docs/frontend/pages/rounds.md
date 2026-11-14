# Rounds

Route: `/rounds`. Access: Signed in.

Every round, searchable, with a scope (all, last 20, best), a course filter and named sorts, and a way to link a round to a course.

## Entry points

- [RoundsPage.tsx](../../../frontend/src/pages/rounds/RoundsPage.tsx)
- [useRoundsPageViewModel.ts](../../../frontend/src/pages/rounds/useRoundsPageViewModel.ts)
- [roundsRepository.ts](../../../frontend/src/pages/rounds/roundsRepository.ts)
- [roundsModel.ts](../../../frontend/src/pages/rounds/roundsModel.ts)
- [useLinkCourse.ts](../../../frontend/src/pages/rounds/useLinkCourse.ts)

## How it works

The list reads light round summaries; each carries its `best_rank` and `worst_rank`, which the Best scope and the sorts use. Rows are `RoundPreview` rows. A round not linked to a course offers Link: under the row on a computer, a bottom sheet on a phone, both on `CourseLinkSearch`. A failed load shows the error with Retry rather than an empty list.

## Boundaries and checks when changing it

Sorting and ranks come from the server's ranks, not client arithmetic. Check a failed load, a failed background refresh (the rounds stay), linking to a saved course and keeping a typed name.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
