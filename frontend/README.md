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

Three layers. Playwright runs the UI tests and screenshots; Vitest is for
view-model logic.

| Layer | Files | Command | What it proves |
|---|---|---|---|
| View model | `tests/use<Page>ViewModelTest.tsx` | `npm test` | Filter, sort, search, pagination, error mapping |
| UI test | `tests/<Page>.ui.spec.ts` | `npm run test:ui` | Behavior: tapping, typing, navigating, persisting |
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
`*.test.*` and `*Test.*`, Playwright matches `*.ui.spec.ts` and
`*.screenshot.spec.ts`.

### Screenshot baselines

Baselines are the Linux renders of CI's Playwright image
(`mcr.microsoft.com/playwright`, the version in `package-lock.json`), so a
screenshot run on a Mac doesn't match them. CI checks looks, in three shards.

To change them on purpose, look at the failing run's diffs, then add the
`update-screenshots` label to the PR. `update-screenshots.yml` regenerates the
baselines in the same image, commits them to the branch and runs the check
again. Review the image diff like any other change.

The check itself never regenerates baselines, so it can always fail.
`scripts/ci/check_no_snapshot_updates.py` allows `--update-snapshots` in
`update-screenshots.yml` only.

## CI gates

| Check | Workflow | Gates |
|---|---|---|
| `Frontend (test \| lint \| types \| build \| ui)` | `tests.yml` | Unit tests, ESLint, tsc, production build, behavior |
| `Frontend visual regression` | `screenshots.yml` | Rendered output against committed baselines |
| `Frontend coverage comment` | `frontend-coverage-bot.yml` | PR comment: Vitest changed-line % plus AI screenshot/UI test counts |
| `Repo invariants` | `tests.yml` | Includes the no-baseline-regeneration rule |

On a pull request both Playwright checks run only the specs the change reaches
(`scripts/select-specs.mjs`; the run summary says why each one ran), and `main`
runs all of them. The `full-suite` label (then a re-run) or the `SPEC_SELECTION=off`
repository variable runs everything.

On a backend-only PR the frontend steps skip (via the `changes` job) but the
checks still report green, so they stay safe to mark required. Both Playwright
jobs upload `playwright-report/` and `test-results/` on failure, which is where
the trace and the actual/diff images land.

## Before pushing

```bash
npm test && npm run test:ui
npm run lint -- --max-warnings=0 && npm run typecheck && npm run build
```
