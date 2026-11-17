# API: HTTP contracts and request boundaries

`api/` exposes the backend through FastAPI. It receives uploads/JSON, authenticates callers, checks resource access, invokes application logic, and converts outcomes into HTTP responses.

## Entry points

[main.py](../../api/main.py) builds the app, installs middleware, registers routers, and manages database startup/shutdown. It can start while the database is unavailable; database-dependent requests require a ready manager through [dependencies.py](../../api/dependencies.py).

| Router | Responsibility |
|---|---|
| `auth.py` | Registration, login/logout, session lookup, verification, and password recovery. |
| `scan.py` | OCR/extraction and reviewed-round saving. Upload checks, temporary files and OCR image preparation are delegated to [scan_uploads.py](../../api/scan_uploads.py) and [scan_image.py](../../services/scan_image.py). |
| `scan_reports.py` | Anonymous failed-scan report submission. |
| `courses.py` | Course lookup, ownership-aware editing, cloning, and course details. |
| `rounds.py` | Round retrieval, edits, deletion, and course links. |
| `users.py` | Profiles, user tees, friendships, and player context. |
| `stats.py` | Dashboard, analytics, comparison, handicap-related responses, and goal reports. |
| `ai_insights.py` | Rule-based insight service endpoint. |

These files are in [api/routers](../../api/routers). Every request body is defined in [request_models.py](../../api/request_models.py) and every response model in [schemas.py](../../api/schemas.py) (plus purpose-specific auth/report schema modules); routers import them and define none of their own. Class and field names are part of the OpenAPI contract the frontend generates its types from, so keep them stable. The status routes (`/`, `/health`, `/api/health`) serve GET and HEAD for health checks but are kept out of the schema, so every operation ID is unique and the schema is the same in every process. `auth_utils.py`, `security.py`, rate limiters, and notification helpers support the request boundary.

Response assembly lives in [round_responses.py](../../api/round_responses.py), [course_responses.py](../../api/course_responses.py), [analytics_responses.py](../../api/analytics_responses.py) and [course_analytics_responses.py](../../api/course_analytics_responses.py). [player_handicap.py](../../api/player_handicap.py) loads the full history for the shared player index. These modules build the declared schemas from domain and Analytics results.

## Typical request

A frontend query calls an API helper; the router resolves authentication/database dependencies and validates the request. Workflow or repository calls produce domain data, then the router returns a response schema. The scan router delegates uploads to [scan_uploads.py](../../api/scan_uploads.py), OCR/merging to [scan_ocr.py](../../services/scan_ocr.py), and round assembly/confidence to [scan_assembly.py](../../services/scan_assembly.py). It owns course access, review-note wording from [messages.py](../../api/messages.py), course handicaps and error translation. Both OCR routes reject oversized provider/merged text with 422; extraction labels that failure `unreadable_scores` at stage `ocr`. The response shape is unchanged; see [extraction](extraction.md) for confidence semantics and current UI limits. The stats router checks access, fetches rounds and calls a builder: [dashboard_responses.py](../../api/dashboard_responses.py), [analytics_responses.py](../../api/analytics_responses.py), [goal_responses.py](../../api/goal_responses.py) (each saver's headline and detail) and [course_analytics_responses.py](../../api/course_analytics_responses.py). Self-only stats routes take the signed-in golfer from `get_self` in [dependencies.py](../../api/dependencies.py), which returns 403 for any other user, an accepted friend included; only analytics also admits accepted friends.

## Changing this domain

Keep parsing, authorization, HTTP statuses, and public error translation here. Reply text comes from two catalogs: [messages.py](../../api/messages.py) for client errors, rate limits and success replies, and [error_responses.py](../../api/error_responses.py) for the generic text of every 5xx reply, which never carries exception details. [test_api_messages.py](../../tests/test_api_messages.py) enforces both rules. Match resource ownership on every read/write path; a frontend `userId` is not proof of authorization. Do not translate intended validation/404 errors into generic 500s. Preserve omitted-versus-null semantics for updates and coordinate request/model/schema constraints.

Request numeric limits follow the domain models rather than defining their own: ratings, yardages and goals match [tee.py](../../models/tee.py) and [user.py](../../models/user.py). Every per-hole yardage map goes through `normalize_hole_yardages` in [request_models.py](../../api/request_models.py), which drops unknown entries and rejects a hole listed twice. Course rows the database keeps unique (hole numbers, handicap ranks, tee names in any case) are rejected at the request. Free-text request fields share one sanitizer rule (`sanitized_text`) under their own field name and limit. Round edits reuse `HoleScoreInput`, which does not accept `net_score`: a per-hole net score has no defined meaning yet, so responses still carry the stored value but requests cannot set it. Course creation takes no holes, holes 1–9, or holes 1–18; when it has holes, every tee yardage must be for one of them.

A course a user links to their own data (profile or registration home course, user tee) must be a master course or one they own; [course_access.py](../../api/course_access.py) holds that rule, and a registering user can only pick a master course. Expected repository errors map to 4xx: duplicates to 409, invalid values to 422, missing records to 404, and a missing referenced course to 400.

Round edits (`PUT /api/rounds/{id}`) are partial: a hole field or round field (`notes`, `weather_conditions`, `tee_box`, `course_name_played`) that the request leaves out keeps its stored value, an explicit `null` clears it, and a hole not yet stored is created from the fields sent. Hole edits use `HoleScore.with_edits` and its [score-correction rules](models.md#model-contracts): entering strokes marks an unplayed hole played, and a stored shots-to-green observation that exceeds the corrected strokes is cleared if the caller omitted it. Compatible omitted observations survive the round editor's save. Explicit counts are validated against the merged hole (putts or shots to green greater than strokes return 422). The hole and round changes are written in one transaction (`round_repo.edit_round`), so a rejected edit writes nothing.

User tees (`/api/users/{id}/tees`) go through [user_tee_service.py](../../services/user_tee_service.py). On `PUT`, an omitted field keeps its value and `null` clears it (`name` can't be null). Yardages on a tee linked to a course must be for that course's holes (422 otherwise). A linked tee's rating covers the course's holes (`rating_holes`) whether it was rated at creation or later; a tee with no linked course has no layout, so its ratings carry no coverage and don't count.

Friendships (`/api/users/me/friends`) never carry another user's email; the email fields are always `null`. A request needs the other golfer's friend code. Sending one when the pair already has a row gives 409 with a reason:
- already friends;
- you already sent one;
- they already sent you one;
- you blocked them (unblock first);
- a neutral "can't send right now". The neutral reply covers both a request the other golfer declined and a block they set, so the two can't be told apart.

The person who declined can still send a request; the person who was declined can't block or remove that row, so a decline only ends when the decliner acts. `DELETE /api/users/me/friends/{id}` removes a friendship or a pending request (either person), a decline (the person who declined) or a block (the person who blocked). A blocked golfer doesn't see the block in their list and can't change it. Profile, user-tee and handicap routes are self-only through `get_self`; there is no lookup by email and no separate handicap route (the dashboard and analytics carry the index). [friendship_responses.py](../../api/friendship_responses.py) builds friendship replies.

Linking a course (`POST /api/rounds/{id}/link-course`) runs in [round_service.py](../../services/round_service.py): the user's own destination course is filled from the round's par/handicap snapshots and tee, then the round is linked, all in one transaction. A missing course or round returns 404; if the round disappears during linking, the destination's gap fills roll back before that response.

Round, course, user and user-tee detail endpoints declare explicit response models in [schemas.py](../../api/schemas.py). Response builders preserve computed values such as course par and round totals, and a new domain field doesn't appear in the JSON until it is added to the response contract.

Stats endpoints ([stats.py](../../api/routers/stats.py)) follow the [Analytics](analytics.md) rules: dashboard and analytics totals come from complete rounds by format, with nine-hole fields (`scoring_average_nine`, `best_round_nine`, …) alongside the 18-hole ones. Lifetime achievements, milestones, course analytics and dashboard totals read the full history (`limit=None` on the round repository); round comparison averages the earlier complete rounds of the same format from that history. Recent windows keep their `limit`. The handicap shown anywhere is the user's current index from the full unfiltered history and their seed/reset. Empty and populated analytics responses come from the same code path. `course_id=home` with no home course returns an empty result. The goal report returns 400 when neither goal is set. Saving a round with no score is a 422.

Course search (`GET /api/courses/search`) returns the user's own courses first, then master courses; `%` and `_` in the query match only themselves. With `include_external=true` it calls the golf course API only when the database has no match, and it does not attach provider IDs to local results. The course list (`GET /api/courses?user_id=`, the Courses page) puts the courses the user has played first, most recently played first, then their other courses, then master courses by name, with the course ID breaking ties so pages are stable.

The course router ([courses.py](../../api/routers/courses.py)) checks access, maps the request and translates errors; [course_responses.py](../../api/course_responses.py) builds every course reply and `CreateCourseRequest.to_course()` builds the new course. A course's `par` can be edited only when none of its holes has a par (`Course.par_from_holes`); otherwise the holes decide it and `PUT` returns 422. A provider ID another of the user's courses already holds is a 409 with its own message, separate from a name conflict, and a database constraint failure on create is a 422. Cloning returns the user's existing copy when they already have one (the same provider ID, or the same name and location), never a similarly named course; cloning a course the user owns returns that course. `POST /api/scan/save` returns 422 with a user-facing message when the save is rejected (no course, incomplete new course, invalid values); see [services](services.md) for the save rules.

The report endpoint intentionally follows a separate anonymous path and does not require user/database resolution. Its contract is in [failed-scan reports](../failed-scan-reports.md).

Focused coverage includes `tests/test_*_routes.py`, request/schema tests, dependencies, and security tests. Verify request, authorization, status, and schema contracts with the relevant tests when changing an endpoint.
