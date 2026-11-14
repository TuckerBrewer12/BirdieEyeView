# Scan

Route: `/scan`. Access: Signed in.

Reads a photographed scorecard into a round to review and save, or takes scores typed in by hand.

## Entry points

- [ScanPage.tsx](../../../frontend/src/pages/scan/ScanPage.tsx)
- [useScanPageViewModel.ts](../../../frontend/src/pages/scan/useScanPageViewModel.ts)
- [scanSession.ts](../../../frontend/src/pages/scan/scanSession.ts)
- [useScanReviewViewModel.ts](../../../frontend/src/pages/scan/useScanReviewViewModel.ts)
- [useScanSetupViewModel.ts](../../../frontend/src/pages/scan/useScanSetupViewModel.ts)
- [useFailedScanReport.ts](../../../frontend/src/data/useFailedScanReport.ts)

## How it works

Photo: the photo and what's on the card (`CardFactsForm`, sent as the scan's note by `cardContext()`), then Read card → processing (`ScanProgress`) → review (unsure scores ringed) → saved. By hand: course, tee and date, then a blank card. The scan session lives above the routes (`ScanSessionProvider`), so a scan outlives navigation. A failed read keeps the photo; its banner offers another photo and, as a small link, Report scan (`ScanReport`), which opens a dialog before sending an anonymous report.

## Boundaries and checks when changing it

Only the scan of the photo still picked may land. A report is sent only when asked, once per failure, and a new photo clears it. See [failed-scan reporting](../../failed-scan-reports.md). Check a failed read, leaving mid-scan and returning, and a preset course.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
