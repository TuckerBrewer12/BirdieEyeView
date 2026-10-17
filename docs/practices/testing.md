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

`python -m scripts.quick_scan_eval` calls Mistral/Gemini and uses provider credits. Failed-scan storage smoke/retrieval commands can access real object storage. Both are separate from ordinary deterministic validation; run them only when the task calls for that integration and the environment is intentionally configured. See [scan evaluation](../../README.md#quick-scan-evaluation) and [report operations](../failed-scan-reports.md).

Report what was actually run and any limits. Passing existing tests is not proof that an uncovered edge case, live deployment, or migration is correct.

## Existing CI checks

[tests.yml](../../.github/workflows/tests.yml) runs backend unit coverage, Ruff, advisory Pyright, high-severity Bandit checks, disposable PostgreSQL integration tests, frontend tests/lint/types/build, and repository invariants. Backend total and changed-line coverage gates are currently 75%; Pyright is explicitly non-blocking while existing errors are addressed. Check the workflow for exact commands instead of treating this guide as a second configuration file.

Separate workflows run screenshot checks and the MVVM/brand-kit review bots. Those bots review added lines; their human-readable rules are linked in [frontend practices](frontend.md). A bot comment complements behavioral validation rather than proving correctness.
