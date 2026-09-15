# BirdieEyeView frontend

React + TypeScript + Vite. Pages follow MVVM: a view (`<Page>.tsx`), a view
model (`use<Page>ViewModel.ts`), and a repository the view model talks to
instead of `fetch`.

```bash
npm install
npm run dev        # http://localhost:5173, proxies /api to localhost:8000
npm run build
```

## Tests

Three layers, borrowed from Android. Playwright is this repo's Espresso;
Vitest is for view-model logic.

| Layer | Files | Command | What it proves |
|---|---|---|---|
| View model | `tests/use<Page>ViewModelTest.tsx` | `npm test` | Filter, sort, search, pagination, error mapping |
| Espresso | `tests/<Page>.espresso.spec.ts` | `npm run test:espresso` | Behavior: tapping, typing, navigating, persisting |
| Screenshot | `tests/<Page>.screenshot.spec.ts` | `npm run test:screenshots` | Look: empty vs populated vs dark, panels open |

`src/pages/rounds/tests/` is the reference layout.

**No mocks.** No `vi.mock`, `vi.fn`, or a `page.route` returning canned JSON.
View-model tests inject `FakeRoundsRepository`; Playwright robots seed
`FakeBackend` through `FakeSession.install`. Fakes live in `src/testing/` and
are always named `Fake…`. This is enforced in review by
`.github/review-bots/ui-test-checker.md`.

**Robots, not locators.** Each screen has one fluent robot
(`<Page>.robot.ts`). Specs read `await rounds.tapChip("Best")` — every
`page.getBy…` belongs on the robot.

**Naming.** Never a bare `*.spec.ts`; Vitest would pick it up. Vitest matches
`*.test.*` and `*Test.*`, Playwright matches `*.espresso.spec.ts` and
`*.screenshot.spec.ts`.

### Screenshot baselines

Baselines are committed as `*-darwin.png`, so the CI job runs on
`macos-latest` to match. Regenerate them locally, on purpose, and review the
image diff like any other change:

```bash
npm run test:screenshots:update
```

CI must never do this for you — a run that regenerates baselines can't fail.
`scripts/ci/check_no_snapshot_updates.py` enforces it.

## CI gates

| Check | Workflow | Gates |
|---|---|---|
| `Frontend (test \| lint \| types \| build \| espresso)` | `tests.yml` | Unit tests, ESLint, tsc, production build, behavior |
| `Frontend visual regression` | `screenshots.yml` | Rendered output against committed baselines |
| `Frontend coverage comment` | `frontend-coverage-bot.yml` | PR comment: Vitest changed-line % plus AI screenshot/espresso counts |
| `Repo invariants` | `tests.yml` | Includes the no-baseline-regeneration rule |

On a backend-only PR the frontend steps skip (via the `changes` job) but the
checks still report green, so they stay safe to mark required. Both Playwright
jobs upload `playwright-report/` and `test-results/` on failure, which is where
the trace and the actual/diff images land.

## Before pushing

```bash
npm test && npm run test:espresso && npm run test:screenshots
npm run lint -- --max-warnings=0 && npm run typecheck && npm run build
```
