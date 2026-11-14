# Frontend architecture and state flow

## App lifecycle

[main.tsx](../../frontend/src/main.tsx) creates the React Query client and mounts the app. [App.tsx](../../frontend/src/App.tsx) installs the auth and theme providers and `ScanSessionProvider`, chooses public versus signed-in routes, and wraps signed-in pages in [AppLayout](../../frontend/src/app/AppLayout.tsx) (the side rail on a computer, the tab bar and More sheet on a phone, from [navigation.ts](../../frontend/src/app/navigation.ts)).

[AuthContext](../../frontend/src/context/AuthContext.tsx) owns the session and account actions. [ScanSessionProvider](../../frontend/src/pages/scan/ScanSessionProvider.tsx) keeps the scan in progress across navigation; it is in-memory state, not a saved round.

## MVVM on the brand kit

Every page follows the same shape, under `pages/<name>/`:

`View (<Name>Page.tsx) → view model (use<Name>PageViewModel.ts) → query/mutation hooks → repository → lib/api.ts → backend`

- The **view** renders what the view model hands it, from kit pieces in `src/brand/`.
- The **view model** holds screen state only and words what the view shows.
- **Query and mutation hooks** own server state and cache effects; ones more than one page reads live in `src/data/`.
- The **repository** owns the endpoint and maps DTOs to domain types.
- **`src/domain/`** holds golf types, wording and formatting. The server owns golf figures; the client doesn't recompute them, apart from the live totals of an unsaved edit or a scan under review (`Round.previewEdits`, `Round.fromScan`).

[lib/api.ts](../../frontend/src/lib/api.ts) is transport only. Response types are generated from the backend's OpenAPI schema into `src/types/api.gen.ts`; run `python scripts/dump_openapi.py` and `npm run gen:api` after changing an API model. Failed-scan reporting has its own [repository](../../frontend/src/data/scanReportRepository.ts), because its anonymous request differs from the signed-in ones.

## Responsive and native behavior

Styling by breakpoint is `md:` classes. `useFromBreakpoint()` is only for behaviour, such as which side a sheet opens from. `src/platform/` holds the web and native adapters (photo compression, sharing, the Capacitor camera) that the app passes in.
