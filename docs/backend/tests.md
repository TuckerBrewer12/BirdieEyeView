# Backend tests: behavior and integration

The root `tests/` directory covers Models, Analytics, services, API routes/security, and persistence. [pyproject.toml](../../pyproject.toml) holds pytest, coverage, and Ruff configuration.

## Main test boundaries

| Area | Typical files | What to verify |
|---|---|---|
| Models | `test_models.py` | Validation, safe updates, coverage, and resolved calculations. |
| Analytics | `test_analytics.py`, `test_handicap.py`, `test_goals.py` | Real observation denominators, history/format eligibility, and numerical results. |
| API | `test_*_routes.py`, security/dependency tests | Authentication, ownership, status/schema contracts, and failure handling. |
| Services/parser | `test_scan_service.py`, OCR/parser/merger tests | Orchestration, stable fixtures, retries, and malformed/missing data. |
| Reports | `test_scan_report_*.py` | Anonymous contract, sanitization, encryption, storage, and retrieval. |
| Database | `test_database*.py`, `integration/` | SQL mapping/unit behavior and real PostgreSQL constraints/transactions. |

Fake providers and repositories keep unit tests deterministic. A response test that mocks all aggregation inputs does not validate the underlying math; pair boundary tests with real-model calculation cases when changing calculations.

Run focused tests for the changed behavior, then required broader checks. Integration tests require an explicit `TEST_DATABASE_URL` and reset schemas. Live scan evaluation and report-provider smoke checks are separate opt-in operations. See [testing practices](../practices/testing.md) for commands and limits.
