# Landing and try it

Route: `/` when signed out. Access: Public.

The public page: the hero with its scan demo and app tour, and trying a scan without an account.

## Entry points

- [LandingPage.tsx](../../../frontend/src/pages/landing-page/LandingPage.tsx)
- [useTryItYourselfViewModel.ts](../../../frontend/src/pages/landing-page/useTryItYourselfViewModel.ts)
- [ScannerDemo.tsx](../../../frontend/src/pages/landing-page/components/ScannerDemo.tsx)
- [useScannerDemoViewModel.ts](../../../frontend/src/pages/landing-page/components/useScannerDemoViewModel.ts)
- [HeroSection.tsx](../../../frontend/src/pages/landing-page/sections/HeroSection.tsx)

## How it works

A picked photo brings `CardFactsForm` and then the scan's progress into the photo's place; the scanned card becomes "Here's your round" with a sign-up strip. Nothing is saved. The demo's tour shows captures in `public/demo-tour/`, made by the `demo-tour` Playwright project. A failed scan can be reported, anonymously, as on the scan page.

## Boundaries and checks when changing it

Recapture the tour (`--project=demo-tour --update-snapshots=all`) when the dashboard, analytics or Profile change. Check a failed scan and its report.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
