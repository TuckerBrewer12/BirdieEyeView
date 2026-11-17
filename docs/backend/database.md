# Database: persistence and row conversion

`database/` stores golf data and account relationships in PostgreSQL using asyncpg. It owns SQL and persistence mapping; it does not own HTTP statuses or presentation formatting.

## Important files

| File | Responsibility |
|---|---|
| [connection.py](../../database/connection.py) | Shared connection pool lifecycle and configuration. |
| [db_manager.py](../../database/db_manager.py) | Facade exposing composed repositories. |
| [converters.py](../../database/converters.py) | Database row/model conversion. |
| [repositories](../../database/repositories) | Course, round, user, user-tee, and friendship queries/writes. |
| [schema.sql](../../database/schema.sql) | Current schema definition used to create fresh test databases. |
| [migrations](../../database/migrations) | Incremental SQL changes for existing databases. |

The `courses` schema holds course, hole, tee, and yardage information. The `users` schema holds profiles/auth state, rounds/hole scores, user tees, scan records, and friendships. Inspect SQL for exact table definitions. `user_id IS NULL` distinguishes master courses from user-owned courses; row access and authorization still need enforcement at caller boundaries.

## Data flow

The API lifecycle creates a pool and DatabaseManager. Services/routers call a repository, which executes parameterized SQL and maps rows into domain objects. Round hole-score snapshots allow historical context to survive without a linked master course.

## Changing this domain

Coordinate schema definitions, migrations, converters, model fields, and request/response semantics. A local model field is not persisted merely because it exists. Group logically atomic writes into an explicit transaction; do not assume multiple repository calls share one transaction. To make several repository writes one unit, open `DatabaseManager.transaction()` and pass its connection as `connection=` to write methods that accept it (`create_course`, `fill_course_gaps`, `apply_verified_scan`, `create_round`, `link_course_to_round`, and related lookups); each then runs as a savepoint inside the caller's transaction. Without `connection=`, a method keeps its own transaction. The round-link service raises `NotFoundError` inside the transaction if the round disappears, so prior gap fills roll back. `round_repo.edit_round` applies a round edit in one transaction: each hole change is merged through `HoleScore.with_edits` (see [model correction rules](models.md#model-contracts)) and round fields are updated with the same rules as `update_round`. Keep null/omission/update rules intentional, and use database constraints to enforce agreed rules under concurrency.

In the [friendship repository](../../database/repositories/friendship_repo.py), the requester of a `blocked` row is always the person who blocked: blocking rewrites the row's direction. `remove` deletes a row when the actor may (see [API](api.md)), and `list_for_user` hides a block from the blocked person. Requests, status changes and removals lock the row (or the pair) for the transaction.

In the [course repository](../../database/repositories/course_repo.py), a unique violation on a provider-ID index raises `DuplicateProviderIdError` (a `DuplicateError`), so callers can tell it from a name conflict. `clone_course` recovers from a duplicate only with the user's exact copy (same provider ID, or the name and location the uniqueness index compares), never a fuzzy match. The summary queries escape `LIKE` wildcards in search text and end their order with the course ID; the course list orders the user's played courses first.

The converters and repositories persist the Models coverage, rating, goal and historical-context contracts. The integration includes these migrations:

- [013_add_course_trigram_indexes.sql](../../database/migrations/013_add_course_trigram_indexes.sql): course-name and location search indexes from `main`.
- [014_persist_domain_context.sql](../../database/migrations/014_persist_domain_context.sql): explicit coverage, rating and goal metadata, historical context and golf bounds.
- [015_scope_identity_and_history.sql](../../database/migrations/015_scope_identity_and_history.sql): scoped identities and stable round-history order.
- [016_add_user_sessions.sql](../../database/migrations/016_add_user_sessions.sql): `users.sessions`, one row per signed-in session (`jti`, user, expiry). Additive; apply it before deploying the code that checks sessions, or every authenticated request fails.

Migrations are applied by hand; there is no tracking table. Migration 013 is safe to re-run. Migration 016 only creates a table and index (`IF NOT EXISTS`). Migrations 014 and 015 are one-time transactional upgrades with data preflight checks; their column/index additions are not idempotent, so inspect the database before applying them and do not blindly replay them. Their presence here does not certify production application. [test_database_migrations.py](../../tests/integration/test_database_migrations.py) checks migration replay against the fresh schema and preflight failures.

Unit/fake-query coverage lives in `tests/test_database*.py`. Real repository tests are in [tests/integration](../../tests/integration) and reset schemas in an explicitly designated disposable database; see [testing practices](../practices/testing.md).
