#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from fnmatch import fnmatch

LIMIT = 500
OVERRIDE_LABEL = "large-pr"
OVERRIDE_BOX = re.compile(r"^\s*[-*]\s*\[[xX]\]\s*Over 500 lines on purpose", re.MULTILINE)
APPLIES_FROM = datetime.fromisoformat("2026-11-20T23:00:00+00:00")
GENERATED = [
    "frontend/openapi.json",
    "frontend/src/types/api.gen.ts",
    "frontend/src/brand/theme/tokens.gen.css",
    "frontend/src/testing/fixtures/sampleGolfer.ts",
    "package-lock.json",
    "frontend/package-lock.json",
    "*.png",
]


def is_generated(path: str) -> bool:
    return any(fnmatch(path, pattern) for pattern in GENERATED)


def counted_files(numstat: str) -> list[tuple[str, int]]:
    files = []
    for row in numstat.splitlines():
        added, deleted, path = row.split("\t", 2)
        if added == "-" or is_generated(path):
            continue
        files.append((path, int(added) + int(deleted)))
    return files


def overridden(body: str | None, labels: list[str]) -> bool:
    return OVERRIDE_LABEL in labels or bool(OVERRIDE_BOX.search(body or ""))


def applies(created_at: str) -> bool:
    return datetime.fromisoformat(created_at.replace("Z", "+00:00")) >= APPLIES_FROM


def verdict(files: list[tuple[str, int]], body: str | None, labels: list[str], created_at: str) -> tuple[bool, str]:
    total = sum(lines for _, lines in files)
    size = f"This PR changes {total} lines, generated files not counted."
    if total <= LIMIT:
        return True, f"{size} The cap is {LIMIT}."
    if not applies(created_at):
        return True, f"{size} It was opened before the {LIMIT}-line cap, so the cap doesn't apply."
    if overridden(body, labels):
        return True, f"{size} It's over the {LIMIT}-line cap on purpose."
    return False, (
        f"{size} The cap is {LIMIT}: split it into smaller PRs. If it can't be split, say why under "
        f"Why?, then tick \"Over 500 lines on purpose\" in the description or add the `{OVERRIDE_LABEL}` label."
    )


def main() -> int:
    with open(os.environ["GITHUB_EVENT_PATH"]) as event_file:
        pr = json.load(event_file)["pull_request"]
    numstat = subprocess.run(
        ["git", "diff", "--numstat", "--no-renames", f"{os.environ['BASE_SHA']}...{os.environ['HEAD_SHA']}"],
        check=True, capture_output=True, text=True,
    ).stdout
    files = counted_files(numstat)
    ok, message = verdict(files, pr.get("body"), [label["name"] for label in pr.get("labels", [])], pr["created_at"])

    biggest = sorted(files, key=lambda item: -item[1])[:10]
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as out:
            out.write(f"### PR size\n\n{message}\n\n| File | Lines |\n|---|---|\n")
            out.writelines(f"| `{path}` | {lines} |\n" for path, lines in biggest)
    print(message if ok else f"::error title=PR size::{message}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
