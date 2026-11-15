# Career

Route: `/career`. Access: Signed in.

Lifetime and last-365-day records: score totals by kind, round records and the handicap trend.

## Entry points

- [CareerPage.tsx](../../../frontend/src/pages/career/CareerPage.tsx)
- [useCareerPageViewModel.ts](../../../frontend/src/pages/career/useCareerPageViewModel.ts)
- [present.ts](../../../frontend/src/pages/career/present.ts)

## How it works

Records come from the stats endpoints; the handicap trend follows the Lifetime / Last 365 Days switch through each row's `in_window`. Score totals are named in their score colour (`ScoreKindLabel`), round records carry an `IconBadge`.

## Boundaries and checks when changing it

Records set by a round's total count full rounds only. Check a golfer with no rounds in the last year.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
