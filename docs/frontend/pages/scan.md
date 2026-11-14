# Scan

Route: `/scan`. Access: Signed in.

Uploads or captures a scorecard, processes it, presents editable results, and saves an accepted round.

## Entry points

- [ScanPage.tsx](../../../frontend/src/pages/ScanPage.tsx)
- [useScan.ts](../../../frontend/src/hooks/useScan.ts)
- [ScanContext.tsx](../../../frontend/src/context/ScanContext.tsx)
- [useFailedScanReport.ts](../../../frontend/src/hooks/useFailedScanReport.ts)

## How it works

ScanPage selects upload/manual setup, processing, review, or success components from useScan state. ScanContext preserves that state across navigation. Saving and reporting are separate actions; a successful save fetches the saved round before presenting the success view.

## Boundaries and checks when changing it

Preserve the original failed-attempt identity across report retries and clear stale report state for a replacement scan. Unknown optional stats remain unknown. See [failed-scan reporting](../../failed-scan-reports.md); structural model readiness does not mean the full verified-save integration is finished.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
