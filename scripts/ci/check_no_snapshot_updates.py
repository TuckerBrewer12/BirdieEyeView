#!/usr/bin/env python3
"""CI must never regenerate screenshot baselines.

A workflow that runs Playwright with `--update-snapshots` (or the
`test:screenshots:update` script) rewrites the committed PNGs instead of
comparing against them. The visual-regression gate would then pass no matter
what the UI looks like. Baselines are refreshed locally, on purpose, and
reviewed as part of the diff.
"""
from __future__ import annotations

import sys
from pathlib import Path

WORKFLOWS = Path(__file__).resolve().parents[2] / ".github" / "workflows"
FORBIDDEN = ("--update-snapshots", "test:screenshots:update")


def main() -> int:
    offenses: list[tuple[Path, int, str, str]] = []

    for workflow in sorted(WORKFLOWS.glob("*.y*ml")):
        for lineno, raw in enumerate(workflow.read_text().splitlines(), start=1):
            line = raw.split("#", 1)[0]
            for needle in FORBIDDEN:
                if needle in line:
                    offenses.append((workflow, lineno, needle, raw.strip()))

    for workflow, lineno, needle, line in offenses:
        rel = workflow.relative_to(WORKFLOWS.parents[1])
        print(
            f"::error file={rel},line={lineno}::"
            f"'{needle}' regenerates screenshot baselines in CI, which makes the "
            f"visual-regression check unable to fail. Update baselines locally "
            f"with 'npm run test:screenshots:update' and commit them. Found: {line}"
        )

    if offenses:
        print(
            f"\n{len(offenses)} workflow line(s) regenerate screenshot baselines.",
            file=sys.stderr,
        )
        return 1

    print("OK: no workflow regenerates screenshot baselines.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
