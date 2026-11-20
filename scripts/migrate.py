#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import asyncpg

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "database" / "migrations"
NAME_RE = re.compile(r"^(\d{3})_[a-z0-9_]+\.sql$")
OWN_TRANSACTION_RE = re.compile(r"^\s*(BEGIN|COMMIT)\s*;\s*$", re.IGNORECASE | re.MULTILINE)
ADVISORY_LOCK_KEY = 7_316_042_016
LOCK_TIMEOUT = "15s"


class MigrationError(Exception):
    pass


@dataclass(frozen=True)
class Migration:
    version: int
    path: Path

    @property
    def name(self) -> str:
        return self.path.name

    def sql(self) -> str:
        return OWN_TRANSACTION_RE.sub("", self.path.read_text(encoding="utf-8"))


def discover(migrations_dir: Path = MIGRATIONS_DIR) -> list[Migration]:
    found = []
    for path in sorted(migrations_dir.glob("*.sql")):
        match = NAME_RE.match(path.name)
        if not match:
            raise MigrationError(f"{path.name}: name must match NNN_snake_case_description.sql")
        found.append(Migration(int(match.group(1)), path))
    return found


async def _ensure_history_table(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """CREATE TABLE IF NOT EXISTS public.schema_migrations (
               version INTEGER PRIMARY KEY,
               name TEXT NOT NULL,
               applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
           )"""
    )


async def applied_versions(conn: asyncpg.Connection) -> set[int]:
    await _ensure_history_table(conn)
    return {row["version"] for row in await conn.fetch("SELECT version FROM public.schema_migrations")}


async def baseline(conn: asyncpg.Connection, through: int, migrations: list[Migration]) -> list[str]:
    await _ensure_history_table(conn)
    recorded = []
    async with conn.transaction():
        for migration in migrations:
            if migration.version > through:
                break
            inserted = await conn.fetchval(
                """INSERT INTO public.schema_migrations (version, name) VALUES ($1, $2)
                   ON CONFLICT (version) DO NOTHING RETURNING version""",
                migration.version,
                migration.name,
            )
            if inserted is not None:
                recorded.append(migration.name)
    return recorded


async def apply_pending(conn: asyncpg.Connection, migrations: list[Migration]) -> list[str]:
    applied = await applied_versions(conn)
    if not applied:
        has_schema = await conn.fetchval("SELECT to_regclass('users.users') IS NOT NULL")
        if has_schema:
            raise MigrationError(
                "This database has tables but no migration history. Check which migrations it already has, "
                "then record them once with: python scripts/migrate.py --baseline NNN"
            )
        raise MigrationError(
            "This database is empty. Load database/schema.sql, then record every migration with: "
            f"python scripts/migrate.py --baseline {migrations[-1].version:03d}"
        )

    ran = []
    for migration in migrations:
        if migration.version in applied:
            continue
        try:
            async with conn.transaction():
                await conn.execute(f"SET LOCAL lock_timeout = '{LOCK_TIMEOUT}'")
                await conn.execute(migration.sql())
                await conn.execute(
                    "INSERT INTO public.schema_migrations (version, name) VALUES ($1, $2)",
                    migration.version,
                    migration.name,
                )
        except asyncpg.PostgresError as error:
            raise MigrationError(f"{migration.name} failed and was rolled back: {error}") from error
        ran.append(migration.name)
    return ran


async def _with_lock(conn: asyncpg.Connection, work):
    await conn.execute("SELECT pg_advisory_lock($1)", ADVISORY_LOCK_KEY)
    try:
        return await work()
    finally:
        await conn.execute("SELECT pg_advisory_unlock($1)", ADVISORY_LOCK_KEY)


async def run(args: argparse.Namespace) -> int:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL is required.", file=sys.stderr)
        return 1
    migrations = discover()
    conn = await asyncpg.connect(dsn)
    try:
        if args.status:
            applied = await applied_versions(conn)
            for migration in migrations:
                print(f"{'applied' if migration.version in applied else 'PENDING'}  {migration.name}")
            return 0
        if args.baseline is not None:
            recorded = await _with_lock(conn, lambda: baseline(conn, args.baseline, migrations))
            print(f"Recorded {len(recorded)} migration(s) as already applied: {', '.join(recorded) or 'none'}")
            return 0
        ran = await _with_lock(conn, lambda: apply_pending(conn, migrations))
        print(f"Applied {len(ran)} migration(s): {', '.join(ran)}" if ran else "Database is up to date.")
        return 0
    except MigrationError as error:
        print(f"Migration failed: {error}", file=sys.stderr)
        return 1
    finally:
        await conn.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply pending database migrations.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--status", action="store_true", help="List applied and pending migrations.")
    mode.add_argument("--baseline", type=int, metavar="NNN", help="Record 001 through NNN as already applied.")
    return asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    sys.exit(main())
