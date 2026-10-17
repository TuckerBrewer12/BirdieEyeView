# Shared UI, themes, and chart presentation

The app currently has a newer brand kit alongside established Tailwind/component layouts. The checked-in [brand-kit review rules](../../.github/review-bots/brand-kit.md) govern added/changed UI; untouched legacy styling remains migration work.

## Brand kit

[brand/index.ts](../../frontend/src/brand/index.ts) exposes components including Button, Panel, PageTitle, SearchField, filter/sort controls, RoundPreview, and CourseLinkSearch. [brand/theme](../../frontend/src/brand/theme) supplies semantic colors and `useTheme()`. Rounds is a current consuming example.

Brand previews run through [BrandHarness](../../frontend/src/brand/BrandHarness.tsx) at `/__brand__/:story` in development. Component screenshot tests and robots live under `brand/tests/`. Preview stories exercise visual states independently of production requests.

## Existing layouts and themes

`components/layout/` owns app navigation, PageHeader, and ResponsivePage. Domain folders such as `components/dashboard/`, `components/analytics/`, and `components/scan/` hold feature presentation. Existing chart/card styles use Tailwind and `index.css`; the root AGENTS.md records the established design system. New or changed color values should come from the token sources accepted by the brand-kit rules; existing raw colors do not justify adding more.

[lib/theme.ts](../../frontend/src/lib/theme.ts) persists public and signed-in theme preferences and toggles the root `dark` class. Brand `useTheme()` observes that class. Use semantic tokens where available rather than duplicating literal light/dark values in new reusable controls.

## Golf charts

Score colors carry meaning across pages. [chartPalettes.ts](../../frontend/src/lib/chartPalettes.ts), [accessibility.ts](../../frontend/src/lib/accessibility.ts), existing score-color utilities, and brand theme score tokens support presentation. Keep color-blind overrides and labels consistent; color alone should not carry the result.

The frontend uses Recharts and custom SVG/D3 calculations. These are independent of backend Matplotlib exports. Preserve unknown values as absent/N/A rather than plotting fabricated zeros. Test changed shared controls in light/dark and relevant desktop/mobile states; see [testing practices](../practices/testing.md).
