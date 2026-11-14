# Frontend coding practices

## Existing direction and reference

The checked-in [MVVM review rules](../../.github/review-bots/mvvm.md) specify a `use<Page>ViewModel` hook holding page state and logic, with a view that renders. They explicitly name `frontend/src/pages/RoundsPage/` as the reference. The [brand-kit rules](../../.github/review-bots/brand-kit.md) specify shared UI, color-token sources, previews, and screenshot coverage. These are existing repository expectations, not a new format invented for this guide.

Dashboard, Analytics, Career, The Lab, and Rounds already separate substantial page logic into hooks. Rounds also colocates its page, typed hook, and screenshot tests:

```text
frontend/src/pages/RoundsPage/
  index.ts
  RoundsPage.tsx
  useRoundsPageViewModel.ts
  tests/
    RoundsPage.robot.ts
    RoundsPage.screenshot.spec.ts
```

Other view-model hooks currently live under `src/hooks/`. Both arrangements exist; adopting the reference folder everywhere is still migration work. Naming/casing and broad file relocations should follow Tucker's active refactor rather than an independent mechanical rewrite.

## Responsibility boundaries

- **Page:** read route inputs, call the owning hook, render its loading/error/empty states, and compose layouts/components. Keep domain conditions, label construction, formatting, and derived collections in the view model; ordinary JSX rendering still belongs in the view. Rounds currently keeps presentation navigation in the page.
- **View-model hook:** own page queries/mutations, interactive state, derived display data, and meaningful actions exposed through a typed result.
- **Presentation components:** render props and emit events; use shared brand/domain components instead of duplicating controls.
- **API/data helpers:** own request details and special transport contracts. The anonymous report repository intentionally differs from authenticated golf-data requests.
- **Pure helpers/types:** share non-React calculations and transport contracts without importing a page for its types/constants.

Keep mobile and desktop layouts on one view model and let their JSX differ without separate rules or calculations. Avoid duplicated labels/mappings between hook and view. These boundaries do not require a page-style hook for every trivial reusable component or duplicated state in multiple layers.

## State and requests

Use React Query for server state, include resource/filter identity in query keys, and reconcile relevant cached data after mutations. Use component/hook state for local edits and context for intentionally shared state such as auth and the cross-route scan. Preserve stale-attempt protection and retry identity in asynchronous scan/report flows.

ResponsivePage mounts both layouts and hides one with CSS. Keep shared fetching in the parent hook and avoid duplicate effects in hidden branches. Preserve accessible controls, error/empty feedback, and keyboard behavior.

## UI and formatting

For added or changed UI, follow the brand-kit rules: use the kit's existing controls rather than hand-rolling equivalents, and obtain colors from `src/brand/theme/colors.ts` or `src/lib/colors.ts`. The migration permits both token sources; new raw hex/RGB/HSL values and raw Tailwind color classes are review findings. Generic shared controls belong in the kit. A new `brand/components/` component needs a corresponding preview and screenshot spec.

Existing untouched Tailwind/chart layouts remain part of the application. Both review bots focus on added diff lines, so this does not require rewriting untouched legacy styling in an unrelated change. Preserve dark mode, score semantics, and color-blind overrides. See [shared UI](../frontend/shared-ui.md).

[tsconfig.app.json](../../frontend/tsconfig.app.json) enables strict TypeScript and the `@/` alias. [eslint.config.js](../../frontend/eslint.config.js) configures TypeScript, React Hooks, and Fast Refresh lint rules. The repo does not currently establish an enforced Prettier configuration. Match the local file style; avoid a whole-file quote/indentation rewrite during a functional change.

## Validation

Use meaningful hook/helper tests and focused visual checks. Rounds and brand components demonstrate Playwright robots for reusable interactions and screenshot specs for visual states. Vitest and Playwright have separate entry points; see [testing practices](testing.md). Update the corresponding [page guide](../frontend/README.md) when the data flow or responsibility changes.
