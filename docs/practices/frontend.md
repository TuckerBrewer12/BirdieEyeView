# Frontend coding practices

## Structure

Every page is MVVM on the brand kit; `pages/rounds/` and `pages/courses/` are the models to copy. A page folder holds the view, its view model, its repository, its query and mutation hooks, `model.ts`/`present.ts` for shaping and wording, page-only `components/`, `previews/`, and `tests/`:

```text
frontend/src/pages/rounds/
  RoundsPage.tsx
  useRoundsPageViewModel.ts
  roundsRepository.ts
  roundsModel.ts
  useLinkCourse.ts
  components/
  tests/
    RoundsPage.robot.ts
    RoundsPage.ui.spec.ts
    RoundsPage.screenshot.spec.ts
    useRoundsPageViewModelTest.tsx
```

Shared code (`domain/`, `data/`, repositories, models, view models) imports nothing from `@/brand`, `react-router` or the DOM; eslint enforces it.

## Responsibility boundaries

- **View:** renders what the view model hands it, from kit pieces. No golf logic, number formatting, sorting or clock reads in JSX.
- **View model:** screen state and wording; it reads the clock and hands over what it means.
- **Query/mutation hooks:** server state and cache effects; shared ones live in `src/data/`.
- **Repository:** the endpoint and DTO → domain mapping. Kit components take domain types, never DTOs.
- **Domain:** golf types, words and formatters (`domain/format.ts`, `domain/date.ts`). The server owns golf figures.

## UI

Colours, type, measures and motion come from `src/brand/theme/tokens.ts`; no raw colours or arbitrary Tailwind values outside it. The repo's own lint rules (`frontend/eslint/`, `golf/*`, `kit/*`, `specs/*`) flag styling that skips the tokens and kit pieces rebuilt by hand; each rule's message names what to use instead. A rule lands with the fixes for what it finds: no `eslint-disable` without a reason.

## Validation

View models are tested with `Fake*` repositories (no `vi.fn`/`vi.mock`). Pages have a Playwright robot, UI tests for flows and screenshot specs for looks, all against `FakeBackend`. `scripts/ci/check_frontend_conventions.py` checks each kit component has a preview and screenshot spec, each page a robot with screenshot specs and UI tests, and each view model a test. See [testing practices](testing.md). Update the [page guide](../frontend/README.md) when a page's data flow changes.

`npm run size` (after `npm run build`; CI's build job runs it) checks `dist/` against the gzip budgets in `frontend/.size-limit.js`: the first load's JS and CSS, read from the built `index.html` by `frontend/scripts/first-load-assets.mjs`, and all JS together. A change that needs more raises the limit in the same PR and says why under **Why?**; a change that shrinks the bundle lowers it.

CI builds with hidden source maps and runs `scripts/ci/bundle_budget.py`: the entry chunk must stay under `ENTRY_GZIP_BUDGET_KB` gzipped and hold nothing from `src/testing/`, `previews/` or `BrandHarness`. Code a signed-out visitor doesn't need belongs in a lazily loaded chunk; raise the budget only with the reason in the PR. Locally: `npm run build -- --sourcemap hidden && python3 ../scripts/ci/bundle_budget.py`.
