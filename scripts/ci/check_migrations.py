#!/usr/bin/env python3
"""Structural checks on database/migrations/.

Migrations are applied by hand in this repo, so ordering and destructive-change
mistakes are silent until they hit a real database. These checks are cheap.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parents[2] / "database" / "migrations"
NAME_RE = re.compile(r"^(\d{3})_[a-z0-9_]+\.sql$")

# Statements that can drop data. Allowed only with an explicit opt-in marker.
DESTRUCTIVE_RE = re.compile(
    r"\b(DROP\s+TABLE|DROP\s+COLUMN|DROP\s+SCHEMA|TRUNCATE)\b", re.IGNORECASE
)
APPROVAL_MARKER = "-- destructive: approved"


def main() -> int:
    errors: list[str] = []
    files = sorted(p for p in MIGRATIONS.glob("*.sql"))

    if not files:
        print(f"No migrations found in {MIGRATIONS}", file=sys.stderr)
        return 1

    seen: dict[str, str] = {}
    for path in files:
        m = NAME_RE.match(path.name)
        if not m:
            errors.append(
                f"{path.name}: name must match NNN_snake_case_description.sql"
            )
            continue

        number = m.group(1)
        if number in seen:
            errors.append(
                f"{path.name}: duplicate migration number {number} "
                f"(also used by {seen[number]})"
            )
        seen[number] = path.name

        body = path.read_text()
        if DESTRUCTIVE_RE.search(body) and APPROVAL_MARKER not in body.lower():
            errors.append(
                f"{path.name}: contains a destructive statement. If intentional, "
                f'add the line "{APPROVAL_MARKER}" to the migration.'
            )

    # Numbers must be contiguous from 001 so ordering is unambiguous.
    numbers = sorted(int(n) for n in seen)
    expected = list(range(1, len(numbers) + 1))
    if numbers != expected:
        missing = sorted(set(expected) - set(numbers))
        errors.append(
            f"migration numbers are not contiguous from 001; missing {missing}"
        )

    for err in errors:
        print(f"::error file=database/migrations::{err}")

    if errors:
        print(f"\n{len(errors)} migration problem(s) found.", file=sys.stderr)
        return 1

    print(f"OK: {len(files)} migrations, numbering contiguous 001-{numbers[-1]:03d}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
