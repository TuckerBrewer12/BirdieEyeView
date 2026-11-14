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

Coordinate schema definitions, migrations, converters, model fields, and request/response semantics. A local model field is not persisted merely because it exists. Group logically atomic writes into an explicit transaction; do not assume multiple repository calls share one transaction. Keep null/omission/update rules intentional, and use database constraints to enforce agreed rules under concurrency.

The current Models refactor still needs migrations and converter/repository support for its added coverage/rating/goal metadata. This guide does not claim those database changes exist or have been applied to production.

Unit/fake-query coverage lives in `tests/test_database*.py`. Real repository tests are in [tests/integration](../../tests/integration) and reset schemas in an explicitly designated disposable database; see [testing practices](../practices/testing.md).
