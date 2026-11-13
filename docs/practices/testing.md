# Testing and validation

Choose checks that exercise the changed behavior. Documentation-only changes need accurate links/source references; they do not require running paid providers, resetting a database, or regenerating screenshots.

## Backend

From the repository root, with the existing environment/dependencies available:

```bash
.venv/bin/python -m pytest -q tests/test_models.py
.venv/bin/python -m pytest -q --ignore=tests/integration
.venv/bin/ruff check models services api analytics database tests
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
npm run typecheck
npm run lint
npm test
npm run build
npm run test:screenshots
```

Use focused test filters where appropriate. Vitest runs helper/hook tests in jsdom; screenshot specs are excluded from that suite. Playwright screenshot tests use the existing config, start their own Vite server on port 5174, and use mocked data/session fixtures. Browser dependencies must be available. Update snapshots only after reviewing the intended visual change; do not regenerate baselines to hide an unexplained failure.

## Live checks

The scan evaluator calls Mistral and Gemini and uses provider credits. Run it locally or add a supported label to a mergeable same-repository PR. Parser changes are gated offline first by the Mistral-capture scenarios in `tests/integration/test_api_e2e.py` (real provider output, no paid calls); refreshing a capture in `tests/integration/fixtures/mistral/` is itself a paid call. The [live eval workflow](../../.github/workflows/scan-evals.yml) publishes a readable Actions Summary and a PR comment as an optional check. Structured results are validated and archived on the public `eval-results` branch by a separate job. The [static dashboard](../../eval-dashboard/README.md) reads those runs without an app server or provider calls. Its deterministic logic tests run with `node --test eval-dashboard/*.test.js`; archive/export tests are CLI-only Python tests. Failed-scan storage smoke and retrieval commands can access real object storage. These live operations are separate from ordinary deterministic validation. See [scan evaluation](../../README.md#scan-evaluation) and [report operations](../failed-scan-reports.md).

Report what was actually run and any limits. Passing existing tests is not proof that an uncovered edge case, live deployment, or migration is correct.

## Existing CI checks

[tests.yml](../../.github/workflows/tests.yml) runs backend unit coverage, Ruff, advisory Pyright, high-severity Bandit checks, disposable PostgreSQL integration tests, frontend tests/lint/types/build, and repository invariants. Backend total and changed-line coverage gates are currently 25%. They measure the unit suite only, and new behavior is tested end to end first, so these gates are a floor rather than a target; Pyright is explicitly non-blocking while existing errors are addressed. Check the workflow for exact commands instead of treating this guide as a second configuration file.

Separate workflows run screenshot checks and the MVVM/brand-kit review bots. Those bots review added lines; their human-readable rules are linked in [frontend practices](frontend.md). A bot comment complements behavioral validation rather than proving correctness.
