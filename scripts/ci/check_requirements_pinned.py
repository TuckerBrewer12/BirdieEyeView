#!/usr/bin/env python3
"""Every runtime dependency must be pinned to an exact version.

CLAUDE.md documents a `pip freeze > requirements.txt` workflow, but unpinned
entries still creep in. An unpinned dep means the deployed image can differ
from what CI tested.
"""
from __future__ import annotations

import sys
from pathlib import Path

REQUIREMENTS = Path(__file__).resolve().parents[2] / "requirements.txt"


def main() -> int:
    unpinned: list[tuple[int, str]] = []

    for lineno, raw in enumerate(REQUIREMENTS.read_text().splitlines(), start=1):
        line = raw.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        if "==" not in line:
            unpinned.append((lineno, line))

    for lineno, line in unpinned:
        print(
            f"::error file=requirements.txt,line={lineno}::"
            f"'{line}' is not pinned to an exact version. Use '{line}==<version>' "
            f"(pip freeze > requirements.txt)."
        )

    if unpinned:
        print(f"\n{len(unpinned)} unpinned dependency(ies).", file=sys.stderr)
        return 1

    print("OK: all requirements.txt entries are pinned with ==.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
