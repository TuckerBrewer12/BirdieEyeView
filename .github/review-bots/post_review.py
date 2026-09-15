#!/usr/bin/env python3
"""Turn the bot's JSON findings into a GitHub review payload.

Usage: post_review.py <findings.json> <diff.patch> <commit_sha> <out.json> [fixable.json]
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

_BOTS = Path(__file__).resolve().parent
if str(_BOTS) not in sys.path:
    sys.path.insert(0, str(_BOTS))

import findings

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


def _context() -> dict[str, str]:
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    pr_number = os.environ.get("PR_NUMBER", "")
    pr_url = os.environ.get("PR_URL") or (
        f"https://github.com/{repo}/pull/{pr_number}" if repo and pr_number else ""
    )
    return {
        "repo": repo,
        "pr_number": pr_number,
        "pr_url": pr_url,
        "bot_name": BOT_NAME,
        "head_sha": os.environ.get("HEAD_SHA", ""),
    }


def decorate(path: str, line: object, body: str, recipe: str, auto_fix: bool) -> tuple[str, str]:
    ctx = _context()
    return findings.decorate_body(
        body=body,
        path=path,
        line=line,
        recipe=recipe,
        auto_fix=auto_fix,
        repo=ctx["repo"],
        pr_number=ctx["pr_number"],
        pr_url=ctx["pr_url"],
        bot_name=ctx["bot_name"],
        head_sha=ctx["head_sha"],
    )


def collect_findings(raw_findings: list[object], valid: dict[str, set[int]]) -> tuple[list[dict], list[dict]]:
    """Split model output into inline-able findings and orphans, with recipes attached."""
    staged: list[dict] = []
    for item in raw_findings:
        if not isinstance(item, dict):
            continue
        path, line, body = item.get("path"), item.get("line"), item.get("body")
        if not path or not body:
            continue
        recipe = findings.recipe_id_of(item.get("recipe"))
        staged.append(
            {
                "path": path,
                "line": line,
                "body": str(body).strip(),
                "recipe": recipe,
                "inline": isinstance(line, int) and line in valid.get(path, set()),
            }
        )

    findings.assign_auto_fix(staged)
    return staged, [s for s in staged if s.get("recipe") and s.get("auto_fix")]


def main() -> int:
    if len(sys.argv) < 5:
        print("usage: post_review.py <findings.json> <diff.patch> <commit_sha> <out.json> [fixable.json]", file=sys.stderr)
        return 2

    findings_path, diff_path, commit_sha, out_path = sys.argv[1:5]
    fixable_path = sys.argv[5] if len(sys.argv) > 5 else ""

    raw = Path(findings_path).read_text().strip()
    array = extract_array(raw)
    if not array:
        # Prose instead of JSON means the model didn't do the task. Warn rather
        # than posting a clean review it never actually earned.
        detail = " ".join(raw.split())[:200] or "(no output)"
        print(f"::warning title={BOT_NAME}::no JSON array in model output: {detail}")
        return 1

    try:
        parsed = json.loads(array)
    except json.JSONDecodeError as exc:
        print(f"::warning title={BOT_NAME}::model did not return JSON ({exc}).")
        return 1

    if not isinstance(parsed, list):
        print(f"::warning title={BOT_NAME}::expected a JSON array.")
        return 1

    valid = added_lines(Path(diff_path).read_text())
    staged, auto = collect_findings(parsed, valid)

    inline: list[dict] = []
    orphans: list[str] = []
    ctx = _context()

    for item in staged:
        decorated, fid = decorate(
            item["path"], item["line"], item["body"], item["recipe"], item["auto_fix"]
        )
        item["id"] = fid
        if item["inline"]:
            inline.append(
                {"path": item["path"], "line": item["line"], "side": "RIGHT", "body": decorated}
            )
        else:
            where = f"{item['path']}:{item['line']}" if item["line"] else item["path"]
            orphans.append(f"- **`{where}`** — {decorated}")

    total = len(inline) + len(orphans)
    if total == 0:
        summary = f"### {BOT_NAME}\n\n✅ {BOT_CLEAN}"
    else:
        noun = "finding" if total == 1 else "findings"
        summary = f"### {BOT_NAME}\n\n{total} {noun} {BOT_LEAD}."
        if inline:
            plural = "" if len(inline) == 1 else "s"
            summary += f"\n\n{len(inline)} left as inline comment{plural} on the diff."
        if auto:
            summary += (
                f"\n\n{len(auto)} will open as "
                f"{'a fix PR' if len(auto) == 1 else 'fix PRs'} targeting this branch. "
                "Merge one to take it as a commit, or use the discuss link on the comment."
            )
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

    fixable = []
    for item in auto:
        fixable.append(
            findings.fix_payload(
                fid=item["id"],
                recipe=item["recipe"],
                path=item["path"],
                line=item["line"],
                body=item["body"],
                bot_name=ctx["bot_name"],
                auto_fix=True,
                pr_number=ctx["pr_number"],
            )
        )
    if fixable_path:
        Path(fixable_path).write_text(json.dumps(fixable))

    print(f"{len(inline)} inline, {len(orphans)} in summary, {len(fixable)} fix PRs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
