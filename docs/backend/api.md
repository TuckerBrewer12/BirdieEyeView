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

Request numeric limits follow the domain models rather than defining their own: ratings, yardages and goals match [tee.py](../../models/tee.py) and [user.py](../../models/user.py). Every per-hole yardage map goes through `normalize_hole_yardages` in [request_models.py](../../api/request_models.py), which drops unknown entries and rejects a hole listed twice. Course rows the database keeps unique (hole numbers, handicap ranks, tee names in any case) are rejected at the request. Round edits reuse `HoleScoreInput`. Course creation takes no holes, holes 1–9, or holes 1–18.

A course a user links to their own data (profile or registration home course, user tee) must be a master course or one they own; [course_access.py](../../api/course_access.py) holds that rule, and a registering user can only pick a master course. Expected repository errors map to 4xx: duplicates to 409, invalid values to 422, missing records to 404, and a missing referenced course to 400.

Round, course, user and user-tee detail endpoints declare response models in [schemas.py](../../api/schemas.py) that freeze the fields those endpoints returned before. They are built from the domain model's serialized form, so computed values such as course par and round totals are kept, and a new domain field doesn't appear in the JSON until it is added there.

Stats endpoints ([stats.py](../../api/routers/stats.py)) follow the [Analytics](analytics.md) rules: dashboard and analytics totals come from complete rounds by format, with nine-hole fields (`scoring_average_nine`, `best_round_nine`, …) alongside the 18-hole ones. Lifetime achievements, milestones, round comparison, course analytics and dashboard totals read the full history (`limit=None` on the round repository); recent windows keep their `limit`. The handicap shown anywhere is the user's current index from the full unfiltered history and their seed/reset. Empty and populated analytics responses come from the same code path. `course_id=home` with no home course returns an empty result. The goal report returns 404 for a missing user and 400 only when neither goal is set. Saving a round with no score is a 422.

Course search (`GET /api/courses/search`) returns the user's own courses first, then master courses. With `include_external=true` it calls the golf course API only when the database has no match, and it does not attach provider IDs to local results. `POST /api/scan/save` returns 422 with a user-facing message when the save is rejected (no course, incomplete new course, invalid values); see [services](services.md) for the save rules.

The report endpoint intentionally follows a separate anonymous path and does not require user/database resolution. Its contract is in [failed-scan reports](../failed-scan-reports.md).

Focused coverage includes `tests/test_*_routes.py`, request/schema tests, dependencies, and security tests. Verify request, authorization, status, and schema contracts with the relevant tests when changing an endpoint.
