---
name: schema-migration
description: "Project-specific database schema change workflow for the Golf ScoreCard app. Use when a change adds, alters or drops a table, column, index or constraint in the courses or users schemas, writes a file in database/migrations/ or edits database/schema.sql, backfills or rewrites existing rows, or for the refactor's step 10 dead-schema drop (users.scorecard_scans, users.rounds.adjusted_gross_score and score_differential, idx_rounds_differential, migration 013's trigram indexes). Finds every user of the schema object, gives the user read-only SQL to check production before anything is dropped and waits for the results, writes the numbered migration, the schema.sql change and the reverse SQL, tests them on the disposable test database, and orders the migration against the code that depends on it. Never touches production."
---

# Schema Migration

## Purpose

Change the PostgreSQL schema without breaking the running app or losing data: find everything that uses the object, check production before anything is dropped, keep a way back, prove the migration on the test database, and apply it in the right order with the code.

Inside `$make-code-change`, steps 1–4 belong to recon and the plan (a destructive change's production results are in hand before the plan is approved), steps 5–8 to the implementation loop, and step 9 to the final response and `$ship-pr`. On its own, the same stops apply: present steps 1–4 and wait for approval before writing files.

## Rules

- Never connect to production or any Railway database, and never run a migration there. The user runs every production command; you write it.
- Run migrations only against the disposable test database (`TEST_DATABASE_URL`, locally `postgresql://localhost:5432/golf_scorecard_test`; its name must start with `test` or end in `_test`). The integration suite resets the same database: do not run these steps while another session's integration run uses it.
- Never edit a migration that may already be applied, and never edit `tests/integration/fixtures/schema_012.sql` (the legacy starting point of the replay test). Write a new migration instead.
- Backups and production query output hold user data: they stay with the user, never in the repository, the PR text or a scratch file you commit.

## How Migrations Work Here

- `database/migrations/NNN_snake_case.sql`, applied by hand with `psql`; there is no tracking table and nothing runs them on deploy (`railway.json` starts one uvicorn process). Which ones production has is only known by inspecting it.
- `database/schema.sql` is the source of truth: the integration fixture (`tests/integration/conftest.py`) builds every test database from it, never from the migrations.
- `scripts/ci/check_migrations.py` (CI) requires contiguous numbers from 001, the `NNN_snake_case.sql` name, and the line `-- destructive: approved` in any migration containing `DROP TABLE`, `DROP COLUMN`, `DROP SCHEMA` or `TRUNCATE`. It does not catch `DROP INDEX`, a narrowed type or a new constraint.
- `tests/integration/test_database_migrations.py` loads `fixtures/schema_012.sql`, applies 013 and the files its `NEW_MIGRATIONS` glob matches, and asserts the result equals a fresh `schema.sql` on columns (name, type, nullability), constraint definitions and index names and definitions. It does not compare defaults, `VARCHAR` lengths, numeric precision, functions, triggers or extensions.
- There are no down files.

## 1. Classify

Name each part of the change; one change can have several:

- **Additive:** new table, nullable column or one with a default, new index, a looser constraint. Old code keeps working.
- **Destructive:** drop a table, column, index or constraint; rename; narrow a type; `NOT NULL`, a tighter `CHECK` or a new `UNIQUE` on existing data; `DELETE` or `TRUNCATE`. Needs step 3.
- **Data:** `UPDATE`/`INSERT` of existing rows (a backfill or normalization). The rule for each row is a user decision; never guess, merge or silently delete data.

## 2. Find Every User

Search every tracked file with no path filter (`data/`, `scripts/`, `.github/`, `frontend/`, test fixtures, `database/sample_data.sql` and docs included), work in progress, and the code production runs:

```bash
git grep -n -I -i -e '<name>' -e '<other spelling>'
git grep -n -I -i --untracked -e '<name>'
git grep -n -I -i -e '<name>' origin/<production branch>
git grep -n -I -E 'FROM \{|INTO \{|UPDATE \{|JOIN \{|information_schema|pg_catalog' -- '*.py'
```

- Production runs what Railway deploys, not your branch: feature PRs merge into `backend-refactor`, which reaches production only when it merges into `main`. Ask the user which branch production deploys if you are not sure.
- Search a column by its bare name too: rows are read as `row["<column>"]`, written through allow-lists (`ROUND_FIELDS` in `round_repo.py`) and mapped in `database/converters.py`. Repositories read whole rows with `SELECT *`, so check what the converter does with each key.
- A model field with the same name may or may not be persisted; trace it. If the column reaches a response, it is in `frontend/openapi.json`: run `$api-contract-change` for that part.
- An index's name appears only in schema files; its users are queries whose filter or order matches its expression. A GIN `gin_trgm_ops` index serves `LIKE`/`ILIKE '%q%'`, regex matches and the `%` operator, but not a bare `similarity(...) > x` filter. Prove it on the test database with `EXPLAIN` (`SET LOCAL enable_seqscan = off` inside a rolled-back transaction shows whether it can be used); production's `idx_scan` (step 3) shows whether it is.
- Keep extensions and functions still in use: `pg_trgm` stays while `similarity()` runs in `course_repo.py`.
- Sort each hit: live code, test, fixture or legacy schema, migration history (never edited), docs and diagrams, generated file. Record what production's branch still has that your branch does not.

The object is dead only when no live code on your branch or on production's branch reads or writes it.

## 3. Production Check (Destructive Changes)

Give the user read-only SQL to run against production, then stop until they paste the results. Wrap it so it cannot write, and put the statistics before any `count(*)` (a count is itself a scan):

```sql
BEGIN TRANSACTION READ ONLY;
SELECT version(), now() AS checked_at;
SELECT stats_reset FROM pg_stat_database WHERE datname = current_database();
-- a table: activity counters since stats_reset
SELECT n_live_tup, n_tup_ins, n_tup_upd, n_tup_del, seq_scan, idx_scan
  FROM pg_stat_user_tables WHERE schemaname = '<schema>' AND relname = '<table>';
-- an index: idx_scan, plus last_idx_scan on PostgreSQL 16+; and whether a constraint owns it
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
  FROM pg_stat_user_indexes WHERE schemaname = '<schema>' AND indexrelname IN ('<index>');
SELECT conname FROM pg_constraint WHERE conindid = '<schema>.<index>'::regclass;
-- rows and last writes
SELECT count(*), max(created_at) FROM <schema>.<table>;
SELECT count(*) FILTER (WHERE <column> IS NOT NULL),
       max(updated_at) FILTER (WHERE <column> IS NOT NULL) FROM <schema>.<table>;
-- a new constraint: rows that would fail it
SELECT count(*) FROM <schema>.<table> WHERE NOT (<new check>);
-- what depends on it
SELECT conrelid::regclass, conname FROM pg_constraint WHERE confrelid = '<schema>.<table>'::regclass;
SELECT view_schema, view_name FROM information_schema.view_table_usage
  WHERE table_schema = '<schema>' AND table_name = '<table>';
-- production is at the state the migration assumes (an object the previous migration created)
SELECT to_regclass('<schema>.<object from the previous migration>');
ROLLBACK;
```

Keep only the queries that apply. When `pg_stat_statements` is installed (`SELECT extname FROM pg_extension`), add `SELECT calls, left(query, 120) FROM pg_stat_statements WHERE query ILIKE '%<name>%';`.

Ask the user to rerun the statistics query after at least a day of normal use. Unchanged counters mean nothing touches the object. Then ask them to take a backup of anything being dropped, after the second reading (a dump also scans):

```bash
pg_dump "<production url>" --table=<schema>.<table> --no-owner --no-privileges -f <table>-<date>.sql
psql "<production url>" -c "\copy (SELECT id, <columns> FROM <schema>.<table> WHERE <column> IS NOT NULL) TO '<table>-<columns>-<date>.csv' CSV HEADER"
```

An index needs no backup: its `indexdef` is the reverse. `pg_dump` must be at least the server's major version.

Proceed only when the user has posted the results and approved the drop: counts are zero or the rows are understood, the counters did not move, nothing depends on the object, and the backup exists or the user waived it. Record the results (date and numbers, no row contents) for the PR text.

## 4. Order The Deploy

| Change | Order |
|---|---|
| New table, column or index the code needs | migration, then the code. A new column is nullable or has a default, so the code still running keeps inserting. |
| Drop | code that stops using it reaches production, then the check, the backup, the migration, and a service restart. |
| Rename, retype, split | expand and contract: add the new object, ship code that writes both and reads the new, backfill, then drop the old in a later change. Never in one step. |
| `NOT NULL`, tighter `CHECK`, new `UNIQUE` | the migration's preflight refuses bad rows (step 5); resolve them with the user first; then the migration; then code that relies on it. |
| Backfill | in the migration's transaction, after the column exists and before the constraint that needs it. |

Restart the Railway service after a migration that drops or retypes a column of a table the app queries: asyncpg caches prepared statements per connection, and a cached `SELECT *` whose result changed fails inside a transaction until the connection is replaced.

## 5. Write The Migration

- Next number: `ls database/migrations | tail -1`, plus one.
- First line `-- Migration NNN: <what, in one line>.`, as 014–016 do; a second comment line only for a rule the SQL cannot show. No other comments (`docs/practices/backend.md`), except `-- destructive: approved` once step 3 is done and the user approved the drop.
- `BEGIN;` … `COMMIT;`, so a failure leaves nothing half-applied. After `BEGIN;`, `SET LOCAL lock_timeout = '5s';` when the migration alters a table the app uses, so it fails fast instead of queueing every request behind its lock.
- Re-runnable where SQL allows it: `IF NOT EXISTS`, `IF EXISTS`. Where it cannot be (a new constraint, a type change, a data rewrite), start with a preflight `DO $$ … RAISE EXCEPTION '<what to resolve>; sample IDs: %', … $$;` that refuses bad data, as 014 and 015 do.
- A backfill follows 006: add the column nullable, `UPDATE`, then `SET NOT NULL`.
- No `CASCADE`: an unexpected dependency should stop the migration. Remember that `DROP COLUMN` also drops that column's indexes and `CHECK` constraints.
- `CREATE INDEX CONCURRENTLY` cannot run in a transaction. Tables here are small; use a plain `CREATE INDEX` unless the production row count says otherwise.
- Write the reverse SQL: what recreates the dropped table, column, index or constraint (take the definition from `schema.sql` or the user's dump), and how to load the backup. It goes in the PR text and the final report, not in a file or a comment.

## 6. Update schema.sql And The Replay Test

- Edit `database/schema.sql` in place: the column inside its `CREATE TABLE`, an index beside its table's indexes, `IF NOT EXISTS` kept. Do not append `ALTER` statements.
- Its result must equal what the migrations produce: same types, nullability, `CHECK` expressions, index names and definitions, defaults. A dropped column takes its indexes and checks with it here too.
- Add the new migration to the replay in `tests/integration/test_database_migrations.py`: its `NEW_MIGRATIONS` glob stops at the last number it was written for (`01[4-6]_*.sql`). Until it includes the new file, the test fails once `schema.sql` changes. For a preflight, add a case like the existing ones: a bad row makes the migration raise and leaves the schema and the row unchanged.

## 7. Test

Commands come from `docs/practices/testing.md`. With `TEST_DATABASE_URL` set to the disposable database:

1. `.venv/bin/python -m pytest -q tests/integration`: every repository and E2E test on the new `schema.sql`, and the replay test.
2. The upgrade from the previous state, with representative rows (for a backfill or a preflight, include the rows it must handle or refuse):

   ```bash
   export PGOPTIONS='-c client_min_messages=warning'
   psql "$TEST_DATABASE_URL" -q -c 'DROP SCHEMA IF EXISTS courses CASCADE; DROP SCHEMA IF EXISTS users CASCADE;'
   git show <base>:database/schema.sql | psql "$TEST_DATABASE_URL" -q -v ON_ERROR_STOP=1
   pg_dump --schema-only -n courses -n users "$TEST_DATABASE_URL" | grep -v -E '^\\(un)?restrict ' > <scratch>/before.sql
   psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "<insert representative rows>"
   psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/NNN_<name>.sql
   psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/NNN_<name>.sql
   ```

   The second run succeeds, or fails in its preflight with nothing changed. Check the rows came through as intended. Dump every state the same way: `pg_dump` 16 writes `\restrict` lines with a random key, which the `grep` removes.
3. The reverse: run the reverse SQL, dump again, and `diff <scratch>/before.sql` against it. Re-added columns land at the end of the table; any other difference is a wrong reverse.
4. What the replay test does not compare: dump this upgraded database, then reset, load the new `database/schema.sql`, dump, and diff the two. Column order and generated constraint names may differ; a default, length, function or trigger difference is drift. Extensions sit outside the two schemas and survive the reset: check `CREATE EXTENSION` changes by reading.
5. The rest of the Final Gates in `.codex/skills/implementation-loop/SKILL.md`, including `scripts/ci/check_migrations.py`.

## 8. Docs

Run `$update-docs` for: the `Migrations:` line, its list and the `database/` tables in `CLAUDE.md`/`AGENTS.md`; the migration list and the paragraph on which migrations are re-runnable in `docs/backend/database.md`; `database/db_diagram.txt` and `db_layer_diagram.txt` when a table or column they draw changes.

## 9. Report And PR Text

The final response and the PR text's `What?` section carry, for a reader applying it by hand:

- the classification and what the migration does;
- for a drop: the production check's date and results, and that the user holds a backup;
- the deploy steps, numbered, with the exact commands, in step 4's order, for example:
  1. Confirm production's code no longer uses `<object>` (deployed from `<branch>` at `<commit>`).
  2. `psql "<production url>" -v ON_ERROR_STOP=1 -f database/migrations/NNN_<name>.sql`
  3. A read-only check that it applied (`SELECT to_regclass(...)`, `information_schema.columns`, `pg_indexes`).
  4. Restart the service, when step 4 says so, and try the affected feature.
- the reverse SQL in a fenced `sql` block, and how to restore the backup;
- tests run, and the frontend impact or "no frontend change".

## Step 10: Dead Schema

Known facts for the planned drop; confirm each against the code before relying on it:

- `users.scorecard_scans`: `save_scan` and `get_scans_for_round` were removed on `backend-refactor` (#720); `main` still defines them, with no callers outside a test.
- `users.rounds.adjusted_gross_score` and `score_differential`: dropping them also drops `idx_rounds_differential` and the `adjusted_gross_score` check. `main`'s `ROUND_FIELDS` still allows both; confirm no request on `main` can write them. `tests/test_database.py` row fixtures carry both keys. `analytics/handicap.py`'s `score_differential` is an unrelated function.
- `idx_courses_name_trgm` and `idx_courses_location_trgm` (013): they were added for the live course search (`search_course_summaries`, `name ILIKE '%q%' OR location ILIKE '%q%'`, #388), not only the seeding script's fuzzy lookup, and the planner can use them for it. Treat them as live unless production's `idx_scan` is zero and the user accepts sequential-scan search. `pg_trgm` stays either way.
- Ask whether each group is its own migration, so each can be checked and reversed alone.

## Continuous Skill Improvement

At the end of every invocation, check whether this run exposed a reusable gap in this skill. Typical evidence:

- A user of a schema object turned up after the search in step 2 called it dead.
- The production check missed a question the user or the results raised, or its SQL failed on the production version.
- The migration, `schema.sql` or the reverse disagreed in a way step 7 did not catch.
- The deploy order or manual steps had to be corrected.

When the evidence is concrete, follow the rules under Continuous Skill Improvement in `.codex/skills/make-code-change/SKILL.md`: the smallest correction, kept separate from the user's task and listed under "Skill changes", with no weakened gates. If no reusable gap appeared, leave the skill unchanged.
