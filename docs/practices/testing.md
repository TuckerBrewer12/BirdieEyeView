# Testing and validation

Choose checks that exercise the changed behavior. Documentation-only changes need accurate links/source references; they do not require running paid providers, resetting a database, or regenerating screenshots.

## Backend

From the repository root, with the existing environment/dependencies available:

```bash
.venv/bin/python -m pytest -q tests/test_models.py
.venv/bin/python -m pytest -q --ignore=tests/integration
.venv/bin/ruff check .
.venv/bin/python scripts/dump_openapi.py --check
for c in scripts/ci/check_*.py; do .venv/bin/python "$c"; done
```

Use the relevant test file instead of `test_models.py` for another domain. Broaden testing when cross-domain behavior changes or failures leave uncertainty. Check real model inputs for numerical behavior; mocking the entire aggregator only proves response construction.

Database integration tests require `TEST_DATABASE_URL`; the fixture intentionally ignores ordinary `DATABASE_URL` and requires a test-only database name. It drops and recreates the `courses` and `users` schemas. Use only a deliberately disposable database:

```bash
.venv/bin/python -m pytest -q tests/integration
```

The command assumes that disposable database is explicitly configured. Do not supply production credentials. See [integration fixture](../../tests/integration/conftest.py) for the exact guard.

## Frontend

From `frontend/`, with dependencies installed:

```bash
npm run check:api
npm run check:tokens
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
npm run test:screenshots
```

Use focused test filters where appropriate. Vitest runs view-model, hook and helper tests in jsdom, with `Fake*` repositories rather than mocks. Playwright runs UI tests (behaviour, through each page's robot) and screenshot specs (looks); both start their own Vite server on port 5174 and answer the API from `FakeBackend`. Screenshot baselines are the Linux renders of CI's Playwright image (`mcr.microsoft.com/playwright`, the version in `package-lock.json`), so a screenshot run on a Mac doesn't match them; CI runs the suite in three shards. Update them only after reviewing the intended visual change in the failing run's diffs; do not regenerate baselines to hide an unexplained failure.

On a pull request, CI runs only the screenshot specs and UI tests the change reaches. [select-specs.mjs](../../frontend/scripts/select-specs.mjs) builds an import graph of `src` with the TypeScript compiler (following each named import through barrels to the file that declares it) and starts each spec from its own file and robot, the page in the folder above its `tests/`, the pages whose routes it opens or asserts, and the kit previews it names. A change to the app shell (what `main.tsx` reaches outside `pages/`), the theme tokens, CSS, a barrel, the dependencies, the Playwright or Vite config, `public/` or these workflows runs every spec. The run summary lists each spec it ran with the import chain to the changed file. Pushes to `main` and manual runs always run every spec; so does a PR with the `full-suite` label (re-run after adding it) or the repository variable `SPEC_SELECTION=off`.

To refresh the baselines, add the `update-screenshots` label to the PR. [update-screenshots.yml](../../.github/workflows/update-screenshots.yml) regenerates the baselines in the same image, commits them to the branch, removes the label and runs the check again; review the PNG diff before merging. [check_no_snapshot_updates.py](../../scripts/ci/check_no_snapshot_updates.py) rejects any other workflow that would regenerate them, so the check itself can always fail.

## Live checks

The scan evaluator calls Mistral and Gemini and uses provider credits. Run it locally or add a supported label to a mergeable same-repository PR. Parser changes are gated offline first by the Mistral-capture scenarios in `tests/integration/test_api_e2e.py` (real provider output, no paid calls); refreshing a capture in `tests/integration/fixtures/mistral/` is itself a paid call. The [live eval workflow](../../.github/workflows/scan-evals.yml) publishes a readable Actions Summary and a PR comment as an optional check. Structured results are validated and archived on the public `eval-results` branch by a separate job. The [static dashboard](../../eval-dashboard/README.md) reads those runs without an app server or provider calls. Its deterministic logic tests run with `node --test eval-dashboard/*.test.js`; archive/export tests are CLI-only Python tests. Failed-scan storage smoke and retrieval commands can access real object storage. These live operations are separate from ordinary deterministic validation. See [scan evaluation](../../README.md#scan-evaluation) and [report operations](../failed-scan-reports.md).

Report what was actually run and any limits. Passing existing tests is not proof that an uncovered edge case, live deployment, or migration is correct.

## Existing CI checks

[tests.yml](../../.github/workflows/tests.yml) runs backend unit coverage, Ruff, advisory Pyright, high-severity Bandit checks, disposable PostgreSQL integration tests, frontend tests/lint/types/build, and repository invariants. Backend total and changed-line coverage gates are currently 25%. They measure the unit suite only, and new behavior is tested end to end first, so these gates are a floor rather than a target; Pyright is explicitly non-blocking while existing errors are addressed. Check the workflow for exact commands instead of treating this guide as a second configuration file.

Separate workflows run screenshot checks and the MVVM/brand-kit review bots. Those bots review added lines; their human-readable rules are linked in [frontend practices](frontend.md). A bot comment complements behavioral validation rather than proving correctness.
