# Shared UI, the brand kit, and charts

## Brand kit

[brand/index.ts](../../frontend/src/brand/index.ts) exports the kit: surfaces (`Card`, `Sheet`, `ActionBar`, `Alert`), figures (`Stat`, `StatTile`, `ToParFigure`, `ToParPill`), controls (`Button`, `ToggleGroup`, `PickerMenu`, `TabBar`, `SearchField`, `Input`), golf pieces (`RoundPreview`, `CoursePreview`, `ScorecardCard`, `ScorecardGrid`, `RoundShareCard`, `ScanReport`) and the charts in `brand/charts/`. A generic piece another page will want belongs in the kit.

Every kit component has a preview, shown by [BrandHarness](../../frontend/src/brand/BrandHarness.tsx) at `/__brand__/:story` in development, and a screenshot spec under `brand/tests/screenshots/`.

## Tokens and themes

[tokens.ts](../../frontend/src/brand/theme/tokens.ts) holds every design value: the palette, the light and dark mappings, type roles, measures and motion. `tokens.gen.css` is generated from it (`npm run gen:tokens`). Views use the tokens' Tailwind utilities; SVG paint takes `tokens.color.*`. Dark mode is the light mapping with overrides, switched by the root `dark` class.

## Golf charts

Charts are hand-drawn SVG with D3 scales, at their box's width (`useChartWidth`). Score colours carry meaning across pages; colour alone never carries the result. Hover cards are `ChartTooltip`; columns find the hovered one with `useColumnHover`, points with `usePointPick`. Unknown values stay absent rather than plotted as zeros.
