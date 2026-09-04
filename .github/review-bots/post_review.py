#!/usr/bin/env python3
"""Turn the bot's JSON findings into a GitHub review payload.

Usage: post_review.py <findings.json> <diff.patch> <commit_sha> <out.json>
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")


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


def main() -> int:
    findings_path, diff_path, commit_sha, out_path = sys.argv[1:5]

    raw = Path(findings_path).read_text().strip()
    # Tolerate a stray code fence around the JSON.
    fence = re.fullmatch(r"```(?:json)?\s*\n(.*?)\n?```", raw, re.DOTALL)
    if fence:
        raw = fence.group(1).strip()

    try:
        findings = json.loads(raw) if raw else []
    except json.JSONDecodeError as exc:
        print(f"::warning title=Brand Kit Bot::model did not return JSON ({exc}).")
        return 1

    if not isinstance(findings, list):
        print("::warning title=Brand Kit Bot::expected a JSON array.")
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
        summary = "### 🎨 Brand Kit Bot\n\n✅ No hardcoded colors in this PR's UI changes."
    else:
        noun = "finding" if total == 1 else "findings"
        summary = f"### 🎨 Brand Kit Bot\n\n{total} {noun} — hardcoded colors that should come from the brand kit."
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
