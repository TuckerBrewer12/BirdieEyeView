# API: HTTP contracts and request boundaries

`api/` exposes the backend through FastAPI. It receives uploads/JSON, authenticates callers, checks resource access, invokes application logic, and converts outcomes into HTTP responses.

## Entry points

[main.py](../../api/main.py) builds the app, installs middleware, registers routers, and manages database startup/shutdown. It can start while the database is unavailable; database-dependent requests require a ready manager through [dependencies.py](../../api/dependencies.py).

| Router | Responsibility |
|---|---|
| `auth.py` | Registration, login/logout, session lookup, verification, and password recovery. |
| `scan.py` | OCR/extraction and reviewed-round saving. |
| `scan_reports.py` | Anonymous failed-scan report submission. |
| `courses.py` | Course lookup, ownership-aware editing, cloning, and course details. |
| `rounds.py` | Round retrieval, edits, deletion, and course links. |
| `users.py` | Profiles, user tees, friendships, and player context. |
| `stats.py` | Dashboard, analytics, comparison, handicap-related responses, and goal reports. |
| `ai_insights.py` | Rule-based insight service endpoint. |

These files are in [api/routers](../../api/routers). Request and response definitions live in `request_models.py`, `schemas.py`, and purpose-specific auth/report schema modules. `auth_utils.py`, `security.py`, rate limiters, and notification helpers support the request boundary.

## Typical request

A frontend query calls an API helper; the router resolves authentication/database dependencies and validates the request. Workflow or repository calls produce domain data, then the router returns a response schema. In the current code, scan and stats routers also contain substantial assembly/calculation logic; moving that logic is a reviewed refactor direction, not a completed separation.

## Changing this domain

Keep parsing, authorization, HTTP statuses, and public error translation here. Match resource ownership on every read/write path; a frontend `userId` is not proof of authorization. Do not translate intended validation/404 errors into generic 500s. Preserve omitted-versus-null semantics for updates and coordinate request/model/schema constraints.

The report endpoint intentionally follows a separate anonymous path and does not require user/database resolution. Its contract is in [failed-scan reports](../failed-scan-reports.md).

Focused coverage includes `tests/test_*_routes.py`, request/schema tests, dependencies, and security tests. Detailed issues and pending decisions are in the [API review](<../../1. Fix backend consistency issues - API.md>).
