#!/usr/bin/env python3
"""Turn the bot's JSON findings into a GitHub review payload.

Usage: post_review.py <findings.json> <diff.patch> <commit_sha> <out.json>
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")

BOT_NAME = os.environ.get("BOT_NAME", "Review Bot")
BOT_CLEAN = os.environ.get("BOT_CLEAN", "Nothing to flag in this PR.")
BOT_LEAD = os.environ.get("BOT_LEAD", "to look at")


def added_lines(diff: str) -> dict[str, set[int]]:
    """Map file path -> line numbers the diff adds (valid inline targets)."""
    out: dict[str, set[int]] = {}
    path: str | None = None
    lineno = 0

    for raw in diff.splitlines():
        if raw.startswith("+++ b/"):
            path = raw[6:]
            out.setdefault(path, set())
        elif raw.startswith("@@"):
            m = HUNK.match(raw)
            if m:
                lineno = int(m.group(1))
        elif path and raw.startswith("+"):
            out[path].add(lineno)
            lineno += 1
        elif path and (raw.startswith(" ") or raw == ""):
            lineno += 1
        # '-' lines don't advance the new-file counter

    return out


def extract_array(text: str) -> str:
    """Pull the first balanced JSON array out of the model's stdout.

    `opencode run` has no quiet flag, so its default output wraps the reply in
    session chrome. Scanning for a balanced [...] survives that, and a code
    fence, and any stray prose the model adds.
    """
    start = text.find("[")
    if start == -1:
        return ""

    depth = 0
    in_string = False
    escaped = False

    for i, ch in enumerate(text[start:], start):
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    return ""


def main() -> int:
    findings_path, diff_path, commit_sha, out_path = sys.argv[1:5]

    raw = Path(findings_path).read_text().strip()
    array = extract_array(raw)
    if not array:
        # Prose instead of JSON means the model didn't do the task. Warn rather
        # than posting a clean review it never actually earned.
        detail = " ".join(raw.split())[:200] or "(no output)"
        print(f"::warning title={BOT_NAME}::no JSON array in model output: {detail}")
        return 1

    try:
        findings = json.loads(array)
    except json.JSONDecodeError as exc:
        print(f"::warning title={BOT_NAME}::model did not return JSON ({exc}).")
        return 1

    if not isinstance(findings, list):
        print(f"::warning title={BOT_NAME}::expected a JSON array.")
        return 1

    valid = added_lines(Path(diff_path).read_text())

    inline: list[dict] = []
    orphans: list[str] = []

    for f in findings:
        if not isinstance(f, dict):
            continue
        path, line, body = f.get("path"), f.get("line"), f.get("body")
        if not path or not body:
            continue

        if isinstance(line, int) and line in valid.get(path, set()):
            inline.append(
                {"path": path, "line": line, "side": "RIGHT", "body": body}
            )
        else:
            where = f"{path}:{line}" if line else path
            orphans.append(f"- **`{where}`** — {body}")

    total = len(inline) + len(orphans)
    if total == 0:
        summary = f"### {BOT_NAME}\n\n✅ {BOT_CLEAN}"
    else:
        noun = "finding" if total == 1 else "findings"
        summary = f"### {BOT_NAME}\n\n{total} {noun} {BOT_LEAD}."
        if inline:
            plural = "" if len(inline) == 1 else "s"
            summary += f"\n\n{len(inline)} left as inline comment{plural} on the diff."
        if orphans:
            summary += (
                "\n\nThese could not be anchored to a diff line:\n\n"
                + "\n".join(orphans)
            )

    payload = {
        "commit_id": commit_sha,
        "body": summary,
        "event": "COMMENT",
        "comments": inline,
    }
    Path(out_path).write_text(json.dumps(payload))
    print(f"{len(inline)} inline, {len(orphans)} in summary.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
