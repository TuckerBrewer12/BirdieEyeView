# Backend Work Handoff

Updated: October 3, 2026

## Current Workspace

- Checked-out branch: `codex/add-report-failed-scan-button`.
- Current local commit: `47993b5` (`Align red report action with failed scan error messages`); locally available `origin/main`: `b6e0a6b`.
- The checked-out branch has no configured upstream. Do not infer push or merge status from that alone.
- PR 284's local worktree is `/private/tmp/scan-scorecards-pr-284.vGfUsF`, on `codex/scan-score-breakdown-recovery` at `82c4c90`.
- Local `main` is behind the cached `origin/main`; refresh remote state when network access returns before choosing an implementation base.
- Remote refresh failed on October 3, 2026 because GitHub DNS resolution was unavailable. Branch/merge notes below are based on local references or previously recorded status, not a fresh remote audit; verify them before resuming implementation.
- `handoff.md` and the numbered backend review Markdown files are untracked. Do not commit or discard them without user direction.
- Preserve these unrelated local files:
  - modified `.DS_Store`
  - untracked `tests/.DS_Store`
  - untracked `tests/integration/.DS_Store`

Current documentation work records future backend architecture direction only. It does not authorize scan implementation or alter the reporting feature. Reporting recon/operations remain in `.codex/change-artifacts/recon/report-failed-scan-button.md` and `docs/failed-scan-reports.md`.

Activate the backend environment with:

```bash
cd "/Users/guoanwang/Desktop/Golf ScoreCard/ScanScorecards-1"
source .venv/bin/activate
```

## Deferred Project: Robust Backend Tests

GitHub issue: [#289 — Delete slop unit tests; add E2E tests](https://github.com/TuckerBrewer12/BirdieEyeView/issues/289)

Detailed recon:

- `.codex/change-artifacts/recon/robust-unit-tests.md` (`.codex/change-artifacts/recon/robust-unit-tests.md`, local investigation artifact; not committed)

The recon artifact is ignored by Git and exists only locally unless intentionally added to version control.

Baseline command to rerun before resuming test work:

```bash
.venv/bin/python -m pytest -q --ignore=tests/integration --cov --cov-report=term-missing
```

- Earlier test counts and coverage are historical; establish a fresh baseline before resuming.
- All attempted Task 1 and Task 2 test edits were reverted. No application or test changes remain on `codex/robust-unit-tests`.
- Tasks 1–5 are paused until production behavior is reviewed and cross-layer inconsistencies are resolved.
- Regression coverage added alongside focused production fixes counts toward the relevant testing task. The paused standalone test branches should cover only gaps that remain after those production PRs; do not recreate equivalent coverage later.

### Direction

Do not broadly delete unit tests. Preserve fast tests that enforce stable behavior, including parser outcomes, analytics and handicap rules, model and input validation, upload/security policy, and edge-heavy pure logic.

Replace tests that only prove mock wiring, especially:

```text
mock returns X -> function forwards X -> test asserts X
```

Rules:

1. Add stable behavior coverage before deleting the weaker test it replaces.
2. Assert public inputs, outputs, errors, and invariants rather than private helpers, call counts, exact SQL strings, or incidental intermediate structures.
3. Mock true external boundaries; do not mock away the behavior under test.
4. Keep converter, parameter-normalization, query-prevention, and exception-translation unit tests when they protect real Python behavior.
5. Test SQL correctness, ownership filters, constraints, transactions, PostgreSQL types, fuzzy search, and persistence round trips against disposable PostgreSQL.

Future Task 2 cleanup targets already identified:

- `tests/test_stats_routes.py::test_goal_report_uses_goal_engine`
- `tests/test_stats_routes.py::test_get_played_courses_returns_repository_rows`
- `tests/test_database_repositories_extended.py::test_round_repository_lists_scans`
- mocked course list/search repository tests
- `tests/test_database.py::test_user_tee_repo_create`

### Testing Layers

Keep these distinct:

1. **Unit behavior:** domain and algorithm rules.
2. **PostgreSQL integration:** repository behavior against a real disposable database.
3. **API integration:** HTTP-style calls through FastAPI, services, repositories, and PostgreSQL with external providers faked.
4. **Browser E2E:** Playwright drives the real frontend against the local backend/database with external providers faked.
5. **Live scan evaluation:** real Mistral/Gemini calls measure accuracy and latency.

Only live provider evaluation incurs provider cost. API integration deserves a separate branch/PR because it requires an app/client harness, database lifecycle and seeding, authenticated fixtures, provider fakes, markers, and CI changes.

### Paused scope for `codex/robust-unit-tests` — Task 1

Task 1 is standalone and covers all three pure-business test domains:

1. Refactor analytics tests around public functions, smaller named scenarios, observed/missing-data rules, and independent expected outcomes.
2. Replace goal tests that patch analytics collaborators with realistic public `goal_report()` scenarios.
3. Replace handicap private-helper calls and monkeypatched differentials with real rounds exercised through public handicap functions.

Do not perform Task 2 deletion, parser/service work, API integration, PostgreSQL integration, browser E2E, live-provider evaluation, CI, or production behavior changes in this PR. If stronger tests reveal an application-behavior disagreement, document it and handle the behavior change separately.

Task 1 is paused. The attempted implementation confirmed that tests cannot state authoritative behavior while production and documentation disagree:

- Scrambling documents `strokes <= par` but implements `strokes == par`.
- Overall GIR includes unknown GIR observations in the denominator, effectively treating them as misses.

Remaining analytics contracts—including incomplete rounds, 9-hole versus 18-hole comparisons, missing putts, milestones, and personal bests—still require production review. Do not resume this branch until that review is complete.

### Task dependency

Task 2 is the broad low-signal cleanup PR. It must wait until replacement coverage exists from:

- Task 3: parser/service public-contract tests.
- Task 4: PostgreSQL repository integration tests.
- Task 5: FastAPI request/response integration tests.

Task 2 should then delete only tests made redundant by those layers or proven to assert no meaningful behavior.

### Separate follow-up branches

These branch names are planned but the work is unimplemented. Create one from current `origin/main` only if its coverage objective remains incomplete after the production consistency/refactor PRs:

1. `codex/parser-service-unit-contracts`
   - Replace remaining private parser/service helper assertions with public deterministic unit behavior.
   - Expand semantic, metamorphic, adversarial, and stateful-fake scenarios without live provider calls.
2. `codex/repository-integration-tests`
   - Move SQL ownership, filtering, constraints, transaction, PostgreSQL-type, and persistence guarantees to disposable PostgreSQL tests.
   - Delete mocked-SQL tests only after equivalent repository behavior is protected.
3. `codex/api-integration-tests`
   - Build the FastAPI request/response harness with dependency overrides, authenticated fixtures, provider fakes, database lifecycle, markers, and representative endpoints.
   - Keep this distinct from browser E2E and paid live scan evaluation.
4. `codex/low-signal-test-cleanup`
   - Start only after Tasks 3–5 establish replacement coverage.
   - Remove redundant parser/service private-helper tests, mocked repository tests, and direct handler pass-through tests without weakening protected behavior.

## Backend Logic Consistency Audit

The detailed backend-wide audit remains the source of truth for consistency gaps across extraction, API validation, models, persistence, analytics, and tests:

- `.codex/change-artifacts/recon/backend-logic-consistency-audit.md` (`.codex/change-artifacts/recon/backend-logic-consistency-audit.md`, local investigation artifact; not committed)

Its 13 proposed follow-up branches are intentionally not duplicated here. This artifact is also ignored by Git and exists only locally.

## Backend Refactor Roadmap And File Review Map

This ten-step roadmap is separate from testing Tasks 1–5 above. The roadmap covers production correctness and architecture, while the testing tasks are coverage objectives that should be advanced alongside steps 1–8 whenever a production PR touches their behavior. Roadmap step 9 audits and closes only the remaining gaps.

PR sizing rule: use one PR per independently reviewable behavior or architectural boundary, even when it crosses models, API, database, and tests. Do not split one contract by technical layer. A nine-hole contract PR, for example, should carry its model, request validation, database migration, and tests together. The ten roadmap steps are workstreams, not ten individual PRs; expect roughly 20 focused PRs.

### 1. Fix backend consistency issues

Use `backend-logic-consistency-audit.md` as the source of truth and implement its findings in focused branches.

Current user review notes: [parent consistency review](<1. Fix backend consistency issues.md>), [Models review](<1. Fix backend consistency issues - Models.md>), and [API review](<1. Fix backend consistency issues - API.md>). These record discussions and deferred decisions, not completed implementation. The user is reviewing item 1; do not treat the architecture notes below as a request to interrupt that review.

Production files to review:

- Domain: `models/course.py`, `models/round.py`, `models/hole_score.py`, `models/tee.py`, `models/user.py`, `models/user_tee.py`
- API: `api/request_models.py`, `api/routers/courses.py`, `api/routers/rounds.py`, `api/routers/scan.py`, `api/routers/stats.py`, `api/routers/users.py`, `api/routers/auth.py`
- Business logic: `analytics/stats.py`, `analytics/goals.py`, `analytics/handicap.py`, `services/scan_service.py`, `services/ai_service.py`
- Persistence: `database/converters.py`, `database/repositories/course_repo.py`, `database/repositories/round_repo.py`, `database/repositories/user_tee_repo.py`, `database/schema.sql`, `database/migrations/`

Tests to review with the relevant behavior fix:

- `tests/test_models.py`, `tests/test_request_models.py`, `tests/test_analytics.py`, `tests/test_goals.py`, `tests/test_handicap.py`, `tests/test_scan_service.py`
- `tests/test_course_routes.py`, `tests/test_round_routes.py`, `tests/test_user_routes.py`, `tests/test_auth_routes.py`, `tests/test_stats_routes.py`
- `tests/integration/test_course_repository.py`, `tests/integration/test_round_repository.py`, `tests/integration/test_user_tee_repository.py`, `tests/integration/test_database_safety.py`

PR guidance: use approximately one PR per audit finding, combining findings only when they enforce the same invariant. Nine-hole contracts, round completeness, analytics eligibility, missing-data semantics, summary parity, validation, access control, and database-error normalization should not become one PR.

The regression test belongs in the same production PR and counts toward the matching testing objective: public analytics/goals/handicap behavior counts toward Task 1, provider-free parser/service behavior toward Task 3, real PostgreSQL behavior toward Task 4, and real FastAPI request/response behavior toward Task 5. A unit test does not become API or browser E2E merely because it accompanies a production fix.

### 2. Stabilize domain, API, and database contracts

Domain files:

- `models/base.py`, `models/course.py`, `models/hole.py`, `models/round.py`, `models/hole_score.py`, `models/tee.py`, `models/user.py`, `models/user_tee.py`

API contracts:

- `api/request_models.py`, `api/auth_schemas.py`, `api/schemas.py`, `api/input_validation.py`
- Request classes embedded in `api/routers/courses.py`, `api/routers/rounds.py`, `api/routers/users.py`, and `api/routers/scan.py`

Persistence contracts:

- `database/converters.py`, `database/schema.sql`, `database/migrations/`, `database/exceptions.py`

Tests:

- `tests/test_models.py`, `tests/test_request_models.py`, `tests/test_handicap_validation.py`, `tests/test_input_validation.py`, `tests/integration/test_database_safety.py`

Much of this stabilization should happen inside the step 1 behavior PRs. Afterward, one small behavior-neutral consolidation PR for genuinely shared validators, constants, or types is reasonable.

### 3. Refactor `scan.py` and `stats.py`

Scan surface:

- `api/routers/scan.py`, `api/request_models.py`, `api/schemas.py`, `api/error_responses.py`
- `services/scan_service.py`, `services/mistral_ocr_service.py`, `services/mistral_scorecard_parser.py`, `services/gemini_table_merger.py`
- `models/round.py`, `models/hole_score.py`
- Tests: `tests/test_scan_router_helpers.py`, `tests/test_score_sign_disambiguation.py`, `tests/test_scan_service.py`, `tests/test_scan_service_tee_mapping.py`, `tests/test_mistral_scorecard_parser.py`, `tests/test_mistral_ocr_service.py`, `tests/test_gemini_table_merger.py`, `tests/test_quick_scan_eval.py`

Stats surface:

- `api/routers/stats.py`, `api/schemas.py`
- `analytics/stats.py`, `analytics/goals.py`, `analytics/handicap.py`, `services/ai_service.py`
- `database/repositories/round_repo.py`
- Tests: `tests/test_stats_routes.py`, `tests/test_analytics.py`, `tests/test_goals.py`, `tests/test_handicap.py`, `tests/test_ai_service.py`

PR guidance: keep scan-router and stats-router work separate. Scan may need separate upload/preprocessing and extraction/assembly PRs. Keep the specialized parser redesign out of a general router-thinning PR.

Future architecture notes: [3. Backend architecture refactor.md](<3. Backend architecture refactor.md>). The user wants to retain Tucker's hole-centric representation proposal for cleanliness/readability: one reusable parsed-hole class with an instance per hole instead of downstream parallel field arrays. Implementation is deferred; preserve current outputs first, and keep alignment/accuracy changes separate. This is not pixel-column cropping or a full backend rewrite.

### 4. Refactor courses, auth, rounds, and users

Courses:

- `api/routers/courses.py`, `services/golfcourse_api_service.py`, `services/scan_service.py`
- `models/course.py`, `models/hole.py`, `models/tee.py`
- `database/repositories/course_repo.py`, `database/converters.py`, `database/schema.sql`
- Tests: `tests/test_course_routes.py`, `tests/test_golfcourse_api_service.py`, `tests/test_course_name_normalization.py`, `tests/integration/test_course_repository.py`

Authentication:

- `api/routers/auth.py`, `api/auth_schemas.py`, `api/auth_utils.py`, `api/auth_notifications.py`, `api/login_rate_limiter.py`, `api/security.py`, `api/dependencies.py`
- `database/repositories/user_repo.py`, `models/user.py`
- Tests: `tests/test_auth_routes.py`, `tests/test_auth_security.py`, `tests/test_auth_utils_configuration.py`, `tests/test_auth_notifications.py`, `tests/test_rate_limiting.py`, `tests/test_api_dependencies.py`, `tests/integration/test_user_repository.py`

Rounds:

- `api/routers/rounds.py`, `api/request_models.py`, `api/schemas.py`
- `models/round.py`, `models/hole_score.py`
- `database/repositories/round_repo.py`, `database/converters.py`
- Tests: `tests/test_round_routes.py`, `tests/test_models.py`, `tests/integration/test_round_repository.py`

Users, tees, and friendships:

- `api/routers/users.py`, `models/user.py`, `models/user_tee.py`, `analytics/handicap.py`
- `database/repositories/user_repo.py`, `database/repositories/user_tee_repo.py`, `database/repositories/friendship_repo.py`
- Tests: `tests/test_user_routes.py`, `tests/test_handicap.py`, `tests/integration/test_user_repository.py`, `tests/integration/test_user_tee_repository.py`, `tests/integration/test_friendship_repository.py`

PR guidance: use one PR per domain. Do not combine courses, authentication, rounds, and users into one router refactor.

### 5. Split `analytics/stats.py`

Files to review:

- Primary: `analytics/stats.py`
- Consumers: `analytics/goals.py`, `analytics/handicap.py`, `analytics/visualizations.py`, `api/routers/stats.py`, `api/routers/users.py`, `services/ai_service.py`
- Tests: `tests/test_analytics.py`, `tests/test_goals.py`, `tests/test_handicap.py`, `tests/test_ai_service.py`, `tests/test_stats_routes.py`

Natural module boundaries are shared eligibility/observations, scoring, putting, GIR/short game, course/hole analytics, and achievements/milestones.

PR guidance: split incrementally and behavior-preservingly—shared eligibility first, metric families next, achievements/milestones last. Do not combine product-rule changes with file moves.

### 6. Clean up `ScanService` and `AIService`

Scan service:

- `services/scan_service.py`, `api/request_models.py`, `api/routers/scan.py`, `services/golfcourse_api_service.py`
- `models/course.py`, `models/round.py`, `models/hole_score.py`, `models/tee.py`, `models/user_tee.py`, `database/db_manager.py`
- Tests: `tests/test_scan_service.py`, `tests/test_scan_service_tee_mapping.py`, `tests/test_scan_router_helpers.py`, `tests/test_score_sign_disambiguation.py`

AI service:

- `services/ai_service.py`, `api/routers/ai_insights.py`, `api/schemas.py`
- `analytics/stats.py`, `analytics/handicap.py`, `database/db_manager.py`
- Tests: `tests/test_ai_service.py`, `tests/test_ai_insights_routes.py`, `tests/test_analytics.py`, `tests/test_handicap.py`

PR guidance: keep `ScanService` and `AIService` in separate PRs. Remove the service dependency on `api.request_models` and avoid mutating incoming request objects as part of the scan-service work.

### 7. Refactor course and round repositories with PostgreSQL integration coverage

Course persistence:

- `database/repositories/course_repo.py`, `database/converters.py`, `database/exceptions.py`, `database/schema.sql`, `database/migrations/`
- `models/course.py`, `models/hole.py`, `models/tee.py`
- `tests/integration/test_course_repository.py`, `tests/integration/test_database_safety.py`

Round persistence:

- `database/repositories/round_repo.py`, `database/converters.py`, `database/exceptions.py`, `database/schema.sql`, `database/migrations/`
- `models/round.py`, `models/hole_score.py`
- `tests/integration/test_round_repository.py`, `tests/integration/test_database_safety.py`

Integration infrastructure:

- `tests/integration/conftest.py`, `tests/integration/helpers.py`, `tests/conftest.py`

Review mocked tests only after replacement integration behavior exists:

- `tests/test_database.py`, `tests/test_database_repositories_extended.py`

PR guidance: separate course and round repository PRs. Keep multi-table writes transactional. Summary-query parity may deserve an additional focused PR.

### 8. Consolidate configuration, errors, and monitoring

Configuration and startup:

- `api/main.py`, `api/security.py`, `api/dependencies.py`, `api/auth_utils.py`, `api/login_rate_limiter.py`
- `database/connection.py`, `database/db_manager.py`, `nixpacks.toml`, `railpack.toml`

Error taxonomy:

- `api/error_responses.py`, `database/exceptions.py`, all files under `api/routers/`
- `services/mistral_ocr_service.py`, `services/gemini_table_merger.py`, `services/golfcourse_api_service.py`
- Repository error translation under `database/repositories/`

Monitoring insertion points:

- `api/main.py`, `api/routers/scan.py`, provider services, `database/connection.py`, and repository boundaries

Tests:

- `tests/test_api_main.py`, `tests/test_api_security.py`, `tests/test_security_runtime.py`, `tests/test_client_ip_security.py`, `tests/test_rate_limiting.py`, `tests/test_api_dependencies.py`, `tests/test_auth_utils_configuration.py`

PR guidance: configuration, error taxonomy, and monitoring are separate PRs. Do not bury security/configuration changes inside monitoring work.

### 9. Audit and close remaining gaps in testing Tasks 1–5

First inventory the coverage already added by roadmap steps 1–8. Do not repeat tests that now protect the intended behavior. Use a dedicated testing branch only for a coherent remaining gap that was not naturally covered by its production PR.

Task 1 — pure business behavior:

- `tests/test_analytics.py`, `tests/test_goals.py`, `tests/test_handicap.py`

Task 3 — parser/service public contracts:

- `tests/test_mistral_scorecard_parser.py`, `tests/test_score_sign_disambiguation.py`, `tests/test_scan_router_helpers.py`, `tests/test_scan_service.py`, `tests/test_scan_service_tee_mapping.py`, `tests/test_gemini_table_merger.py`, `tests/test_mistral_ocr_service.py`

Task 4 — PostgreSQL repository integration:

- `tests/integration/test_course_repository.py`, `tests/integration/test_round_repository.py`, `tests/integration/test_user_repository.py`, `tests/integration/test_user_tee_repository.py`, `tests/integration/test_friendship_repository.py`, `tests/integration/test_database_safety.py`, `tests/integration/conftest.py`, `tests/integration/helpers.py`

Task 5 — FastAPI request/response integration:

- Replace or strengthen `tests/test_auth_routes.py`, `tests/test_course_routes.py`, `tests/test_round_routes.py`, `tests/test_user_routes.py`, `tests/test_stats_routes.py`, `tests/test_ai_insights_routes.py`, and relevant scan handler tests
- Build on `tests/test_api_main.py`, `tests/conftest.py`, `api/main.py`, and `api/dependencies.py`

Task 2 — low-signal cleanup, performed last:

- `tests/test_database.py`, `tests/test_database_repositories_extended.py`
- Direct-handler and private-helper tests made redundant by Tasks 3–5

Test and CI configuration: `pyproject.toml`, `.github/workflows/tests.yml`.

PR guidance: treat Tasks 1, 3, 4, and 5 as coverage outcomes rather than mandatory standalone PRs. A planned branch may shrink or become unnecessary if earlier production PRs completely satisfy its objective. Task 2 remains a distinct final cleanup PR because deletion must wait until replacement coverage from Tasks 3–5 is verified.

API integration and browser E2E remain separate layers. Task 5 sends real requests through the FastAPI application with controlled dependencies/providers. Browser E2E requires Playwright to drive the frontend and is not completed by unit or API integration tests.

### 10. Documentation, dependency, and dead-file cleanup

Documentation and local planning:

- `AGENTS.md`, `handoff.md`, relevant `.codex/change-artifacts/`

Dependency and deployment configuration:

- `requirements.txt`, `pyproject.toml`, `nixpacks.toml`, `railpack.toml`

Review for active use before moving or deleting:

- `llm/`, `update_mistral.py`, `data/load_player_data.py`, `database/sample_data.sql`
- `analytics/demo.py`, `analytics/visualizations.py`, `analytics/visualize_player_from_db.py`

GitHub automation and guidance:

- `.github/workflows/tests.yml`, `.github/workflows/secret-scan.yml`, `.github/review-bots/`, `.github/pull_request_template.md`

PR guidance: documentation can be one small PR. Dependency restructuring and dead-file removal should be separate because they have different failure modes and rollback needs.

## Active Scan Branch: Score-Breakdown Recovery

Branch: `codex/scan-score-breakdown-recovery`

- Local implementation and cached remote branch are at `82c4c90`; a separate worktree exists.
- Previously recorded as unmerged and based on an older `main`. Recheck the PR's remote status and current base before further work; no fresh remote merge audit was possible in this documentation update.
- No post-implementation provider-backed live evaluation is recorded in the existing notes.

Behavior:

- Treat total strokes as authoritative.
- Require at least nine complete holes consistently satisfying `strokes = shots_to_green + putts`.
- Recover exactly one missing or independently impossible putts/shots value only after establishing that invariant.
- Leave sparse or conflicting data unresolved.
- Calculate GIR after auxiliary-field validation and recovery.

Artifacts:

- `.codex/change-artifacts/recon/scan-score-breakdown-recovery.md`
- `.codex/change-artifacts/implementation/scan-score-breakdown-recovery.md`

## Remaining Parser and Scan Work

### Focused parser follow-ups

These are separate unimplemented PRs:

1. **Improve handicap-row detection**
   - Require complete unique values in the 1–18 range.
   - Reject rows reproducing the current hole-number sequence.
   - Use recognized handicap labels as supporting evidence.
   - Add front-nine and back-nine behavior tests.

2. **Centralize structural row labels**
   - Share conservative categories and aliases for separator, hole, par, handicap, and tee rows.
   - Do not make a hard-coded tee-name dictionary authoritative.

3. **Add endpoint-level incomplete-card coverage**
   - Exercise the public scan extraction boundary with provider-free OCR markdown.
   - Assert incomplete or ambiguous player data produces `422`, not partial or shifted scores.

### Block-specific alignment

Branch: `codex/scan-block-alignment`

- No unique implementation exists.
- Existing recon and an old plan exist, but implementation was paused because false alignment can produce plausible incorrect scores.
- Restart only after fresh recon and approval from current `main`.

Each player/table block may have different separator and subtotal geometry. Future work must establish each block's hole mapping independently and reject ambiguity.

Artifacts:

- `.codex/change-artifacts/recon/scan-block-alignment.md`
- `.codex/change-artifacts/implementation/scan-block-alignment.md`

### Structured scan hints

Branch: `codex/structured-scan-hints`

- No implementation or unique commit exists.
- Update or recreate it from current `main`, then run dedicated recon and planning.

Intended contract:

- Replace hand-authored English `user_context` with typed `ScanHints`.
- Include player name, scoring format, included fields, row order, and the row containing the player's name.
- Use one contract in authenticated scan, public scan, API validation, parser input, and quick-eval fixtures.
- Decide whether legacy prose remains temporarily supported.

### Future parser representation: per-hole objects

See [3. Backend architecture refactor.md](<3. Backend architecture refactor.md>) for the clarified direction and review files.

- Goal: readability and maintainability, not a promised OCR-accuracy gain. Replace downstream parallel field arrays with instances of one reusable parsed-hole class keyed by hole number.
- Preserve row/player classification and hole-column mapping internally. Keep course-wide metadata, tees, subtotals, and player/block context separate.
- Retain unknown values and ambiguity; a class does not repair lost OCR positions or prove an assignment. Convert parsed observations into the existing `HoleScore`/API contracts.
- Begin with behavior-preserving parity tests. Geometry, alignment repairs, recovery-rule changes, confidence calibration, and nine-hole product changes remain separate work.
- The earlier typed-row idea may still support internal classification/source evidence; it is not a competing requirement for downstream representation.
- This is future work only. No implementation plan or final class schema is approved.

### Future issue: two-row scorecards

Create a dedicated issue for accepting any two of total strokes, putts, and shots onto green, then deriving the third from:

```text
strokes = shots_to_green + putts
```

Requirements:

- Convert score-to-par values to absolute strokes first.
- Require confident row classification and hole alignment.
- Validate all derived values.
- Reject negative, impossible, or conflicting results.
- Preserve whether each value was scanned or derived.
- Test all derivation directions, partial cards, missing cells, and conflicts.

Issue creation and implementation remain pending.

## Live Scan Evaluation Automation

The existing local paid-provider evaluator is:

```bash
python -m scripts.quick_scan_eval
```

It is a live accuracy evaluation, not API or browser E2E coverage.

Neither planned label workflow exists yet; adding these labels currently does nothing:

- `run-quick-scan-eval`: run the current four-case evaluator, comment accuracy/timing on the PR, and upload the report.
- `run-scan-evals`: run a future 25–75-card health check, compare with an accepted baseline, comment the delta, and upload mismatches/timing.

Implement both together when the larger suite is ready. They should run only after an intentional label or trusted dispatch, remain non-blocking initially, use protected provider secrets, avoid executing untrusted fork code with secrets, and cancel overlapping paid runs.

## Future Project: Backend Review Bots

These supplement deterministic CI; they do not replace it.

- **Architecture Bot:** thin routers, service-owned business logic, repository-owned SQL, and cross-layer coupling.
- **Test Bot:** success, validation, authorization, not-found, boundary, provider/database failure, and regression coverage.
- **Database Bot:** unsafe queries, transactions, schema/migration/converter/repository mismatches, and missing PostgreSQL integration tests.
- **API Safety Bot:** internal error leakage, overly specific responses, validation, authentication, authorization, and ownership.
- **Python Quality Bot:** names, duplication, oversized functions, magic values, and async/sync mistakes.

Required deterministic gates remain Ruff, type checking, pytest, coverage, and PostgreSQL integration tests.

Automatic fix PRs are limited to tiny mechanical corrections such as formatting, imports, or an unambiguous typo. Behavior, SQL, migrations, transactions, authentication, authorization, API responses, and error handling remain review comments requiring human judgment.

Future bot work must define path filters, prompts, comment deduplication, least-privilege permissions, and tests preventing malformed model output from creating unsafe changes.

## Future Project: Backend Error Monitoring

Add Railway/API monitoring that distinguishes expected input failures from server failures:

- Client failures: validation, unsupported uploads, authentication/authorization, not-found, and other intentional 4xx responses.
- Server failures: unexpected 5xx errors, database faults, provider failures/timeouts, file processing, and deployment/runtime faults.

Capture correlation ID, environment/release, route, status, scan stage, latency, sanitized exception context, provider failure category, and database operation category.

Never send scorecard images, raw OCR markdown, user context, API keys, authorization headers, or credentials by default. Keep public errors generic and do not alert on ordinary 4xx traffic.

Railway logs, Sentry, and OpenTelemetry-compatible tooling remain possible options; no vendor is selected.

## Recommended Next Sequence

1. Continue roadmap item 1 using the parent/Models/API review notes and consistency audit; establish authoritative production rules before continuing test refactors or E2E work.
2. Fix confirmed production inconsistencies in focused branches with the strongest appropriate regression coverage; credit that coverage toward testing Tasks 1, 3, 4, or 5.
3. When separately prioritized, plan the deferred hole-centric representation refactor from the numbered architecture notes. Preserve behavior/API compatibility first; do not bundle unrelated OCR or recovery changes.
4. After the production contracts are stable, audit what remains of Tasks 1, 3, 4, and 5 and create only the focused branches still needed.
5. Perform Task 2 low-signal cleanup only after replacement coverage is verified.
6. Return to scan accuracy, parser follow-ups, evaluation automation, two-row support, review bots, and monitoring as separately prioritized work.

## Rules To Preserve

- Test stable behavior, not the present helper or call graph.
- Mock external boundaries; do not mock away the behavior under test.
- Do not delete weak tests until stronger coverage replaces their meaningful protection.
- Keep SQL behavior in real PostgreSQL integration tests.
- Keep paid live evaluations separate from deterministic unit, API-integration, and browser tests.
- Reject ambiguous scan structure rather than shifting cells or inventing values.
- Keep unrelated `.DS_Store` files untouched.
