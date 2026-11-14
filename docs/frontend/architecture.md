# Frontend architecture and state flow

## App lifecycle

[main.tsx](../../frontend/src/main.tsx) creates the React Query client and mounts the app. [App.tsx](../../frontend/src/App.tsx) installs AuthProvider and ScanProvider, chooses public versus authenticated routes, and supplies the signed-in AppLayout. Authentication loading is resolved before selecting the route tree.

[AuthContext](../../frontend/src/context/AuthContext.tsx) owns session refresh and account actions. [ScanContext](../../frontend/src/context/ScanContext.tsx) keeps the current signed-in scan state across page navigation; it is in-memory state, not proof that an upload or round has been persisted.

## Data and presentation

A typical view-model page follows:

`Page → view-model hook → API client → backend → query cache → derived display data → layout/components`

The hook owns queries, filters, actions, and derived presentation data. Components render data and emit actions. Existing exceptions include pages with requests and state directly inside the component; extracting them is incremental refactor work.

[lib/api.ts](../../frontend/src/lib/api.ts) contains application request helpers; AuthContext has its own auth transport helper. [apiBase.ts](../../frontend/src/lib/apiBase.ts) resolves the backend base URL. Vite proxies `/api` to port 8000 during local development. Shared JSON types live in `src/types/`; they are contracts, not runtime validation of arbitrary server data.

Use React Query for server state and invalidate/update relevant cache entries after mutations. Local UI state belongs in the owning hook/component; context is for state deliberately shared across routes. Failed-scan reporting has a dedicated [repository](../../frontend/src/data/scanReportRepository.ts) because its anonymous request differs from authenticated requests.

## Responsive and native behavior

[ResponsivePage](../../frontend/src/components/layout/ResponsivePage.tsx) renders both layout branches in the React tree and hides one through CSS. Shared requests should remain in the parent hook; hidden branches can still mount effects. AppLayout, Sidebar, and BottomNav provide navigation. Capacitor camera/share helpers adapt browser behavior for native use without moving provider secrets into the client.

## Current naming/location choices

Rounds is colocated under `pages/RoundsPage/`; several other view-model hooks still live under `hooks/`. The checked-in MVVM review rules name Rounds as the reference, while the source remains partly migrated. Coordinate broad relocations with Tucker's active work. See [coding practices](../practices/frontend.md).
