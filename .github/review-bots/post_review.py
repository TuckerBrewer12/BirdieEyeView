#!/usr/bin/env python3
"""Turn the bot's JSON findings into a GitHub review payload.

Usage: post_review.py <findings.json> <diff.patch> <commit_sha> <out.json> [fixable.json] [previous.json] [replies.json]
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
import previous as previous_mod

HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")

BOT_NAME = os.environ.get("BOT_NAME", "Review Bot")
BOT_CLEAN = os.environ.get("BOT_CLEAN", "Nothing to flag in this PR.")
BOT_LEAD = os.environ.get("BOT_LEAD", "to look at")


def added_source(diff: str) -> dict[str, dict[int, str]]:
    """Map file path -> {line number: added source text}."""
    out: dict[str, dict[int, str]] = {}
    path: str | None = None
    lineno = 0

    for raw in diff.splitlines():
        if raw.startswith("+++ b/"):
            path = raw[6:]
            out.setdefault(path, {})
        elif raw.startswith("@@"):
            m = HUNK.match(raw)
            if m:
                lineno = int(m.group(1))
        elif path and raw.startswith("+"):
            out[path][lineno] = raw[1:]
            lineno += 1
        elif path and (raw.startswith(" ") or raw == ""):
            lineno += 1

    return out


def added_lines(diff: str) -> dict[str, set[int]]:
    """Map file path -> line numbers the diff adds (valid inline targets)."""
    return {path: set(lines) for path, lines in added_source(diff).items()}


def extract_balanced(text: str, open_ch: str, close_ch: str) -> str:
    """Pull the first balanced JSON array or object out of the model's stdout.

    `opencode run` has no quiet flag, so its default output wraps the reply in
    session chrome. Scanning for a balanced value survives that, and a code
    fence, and any stray prose the model adds.
    """
    start = text.find(open_ch)
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
        elif ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    return ""


def extract_array(text: str) -> str:
    return extract_balanced(text, "[", "]")


def parse_model_output(raw: str) -> tuple[list[object], dict[str, str], bool]:
    """Return (findings, previous_status_by_id, used_object_format)."""
    obj_text = extract_balanced(raw, "{", "}")
    if obj_text:
        try:
            parsed = json.loads(obj_text)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict) and ("findings" in parsed or "previous" in parsed):
            findings_raw = parsed.get("findings")
            if not isinstance(findings_raw, list):
                findings_raw = []
            status: dict[str, str] = {}
            for item in parsed.get("previous") or []:
                normalized = previous_mod.normalize_model_status(item)
                if normalized:
                    status[normalized[0]] = normalized[1]
            return findings_raw, status, True

    array = extract_array(raw)
    if not array:
        raise ValueError("no JSON array in model output")
    parsed = json.loads(array)
    if not isinstance(parsed, list):
        raise ValueError("expected a JSON array")
    return parsed, {}, False


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


def decorate(
    path: str,
    line: object,
    body: str,
    suggestion: str | None = None,
) -> tuple[str, str]:
    ctx = _context()
    return findings.decorate_body(
        body=body,
        path=path,
        line=line,
        repo=ctx["repo"],
        pr_number=ctx["pr_number"],
        pr_url=ctx["pr_url"],
        bot_name=ctx["bot_name"],
        suggestion=suggestion,
    )


def suggestion_span(
    line: object,
    start_line: object,
    valid: set[int],
) -> tuple[int | None, int] | None:
    """Return (start_line or None, line) if the comment can carry a suggestion."""
    if not isinstance(line, int) or line not in valid:
        return None
    start = start_line if isinstance(start_line, int) else line
    if start > line:
        start, line = line, start
    if start == line:
        return None, line
    if all(n in valid for n in range(start, line + 1)):
        return start, line
    return None, line


def original_text(source: dict[int, str], start: int, end: int) -> str:
    return "\n".join(source.get(n, "") for n in range(start, end + 1))


def collect_findings(
    raw_findings: list[object],
    valid: dict[str, set[int]],
    source: dict[str, dict[int, str]] | None = None,
) -> list[dict]:
    """Normalize model output into findings that can be commented and auto-fixed."""
    source = source or {}
    staged: list[dict] = []
    for item in raw_findings:
        if not isinstance(item, dict):
            continue
        path, line, body = item.get("path"), item.get("line"), item.get("body")
        if not path or not body:
            continue
        inline = isinstance(line, int) and line in valid.get(path, set())
        suggestion = findings.normalize_suggestion(item.get("suggestion"))
        span = suggestion_span(line, item.get("start_line"), valid.get(path, set()))
        if suggestion and span:
            start, end = span
            current = original_text(source.get(path, {}), start or end, end)
            if suggestion.rstrip() == current.rstrip():
                suggestion = None
                span = None
        elif not span:
            suggestion = None
        if not inline:
            suggestion = None
            span = None
        staged.append(
            {
                "path": path,
                "line": line,
                "start_line": span[0] if span else None,
                "body": str(body).strip(),
                "suggestion": suggestion,
                "inline": inline,
            }
        )
    return staged


def _load_previous(path: str) -> list[dict]:
    if not path:
        return []
    raw = Path(path).read_text().strip()
    if not raw:
        return []
    data = json.loads(raw)
    return data if isinstance(data, list) else []


def build_summary(
    *,
    staged: list[dict],
    inline: list[dict],
    orphans: list[str],
    previous: list[dict],
    statuses: dict[int, str],
) -> str:
    total = len(inline) + len(orphans)
    rechecked = len(previous)
    fixed, still_open, orphan_rechecks = previous_mod.recheck_summary_lines(
        previous, statuses
    )

    if total == 0 and rechecked == 0:
        return f"### {BOT_NAME}\n\n✅ {BOT_CLEAN}"

    parts = [f"### {BOT_NAME}"]
    if total == 0:
        if rechecked and still_open == 0:
            parts.append("✅ All earlier findings look fixed. Nothing new to flag.")
        else:
            parts.append("No new findings.")
    else:
        noun = "finding" if total == 1 else "findings"
        kind = "new " if rechecked else ""
        parts.append(f"{total} {kind}{noun} {BOT_LEAD}.")
        if inline:
            plural = "" if len(inline) == 1 else "s"
            parts.append(f"{len(inline)} left as inline comment{plural} on the diff.")
        suggested = [item for item in staged if item.get("suggestion")]
        if suggested:
            noun_s = "includes" if len(suggested) == 1 else "include"
            parts.append(
                f"{len(suggested)} {noun_s} a commit suggestion — apply "
                f"{'it' if len(suggested) == 1 else 'them'} on the comment."
            )
        fix_prs = [item for item in staged if not item.get("suggestion")]
        if fix_prs:
            parts.append(
                f"{len(fix_prs)} will open as "
                f"{'a fix PR' if len(fix_prs) == 1 else 'fix PRs'} targeting this branch. "
                "Merge one to take it as a commit, or use the discuss link on the comment."
            )
        if orphans:
            parts.append(
                "These could not be anchored to a diff line:\n\n" + "\n".join(orphans)
            )

    if rechecked:
        parts.append(
            f"Rechecked {rechecked} earlier "
            f"{'finding' if rechecked == 1 else 'findings'} on this commit: "
            f"{fixed} fixed, {still_open} still open."
        )
        if orphan_rechecks:
            parts.append(
                "Earlier findings that were not on a diff line:\n\n"
                + "\n".join(orphan_rechecks)
            )

    return "\n\n".join(parts)


def main() -> int:
    if len(sys.argv) < 5:
        print(
            "usage: post_review.py <findings.json> <diff.patch> <commit_sha> "
            "<out.json> [fixable.json] [previous.json] [replies.json]",
            file=sys.stderr,
        )
        return 2

    findings_path, diff_path, commit_sha, out_path = sys.argv[1:5]
    fixable_path = sys.argv[5] if len(sys.argv) > 5 else ""
    previous_path = sys.argv[6] if len(sys.argv) > 6 else ""
    replies_path = sys.argv[7] if len(sys.argv) > 7 else ""

    raw = Path(findings_path).read_text().strip()
    try:
        parsed, model_status, used_object = parse_model_output(raw)
    except (ValueError, json.JSONDecodeError) as exc:
        detail = " ".join(raw.split())[:200] or "(no output)"
        print(f"::warning title={BOT_NAME}::no JSON in model output ({exc}): {detail}")
        return 1

    diff_text = Path(diff_path).read_text()
    source = added_source(diff_text)
    valid = {path: set(lines) for path, lines in source.items()}
    staged = collect_findings(parsed, valid, source)
    earlier = _load_previous(previous_path)
    statuses = (
        previous_mod.resolve_statuses(
            earlier, staged, model_status, used_object_format=used_object
        )
        if earlier
        else {}
    )
    staged = previous_mod.new_findings_only(earlier, staged) if earlier else staged

    inline: list[dict] = []
    orphans: list[str] = []
    ctx = _context()

    for item in staged:
        decorated, fid = decorate(
            item["path"], item["line"], item["body"], item.get("suggestion")
        )
        item["id"] = fid
        if item["inline"]:
            comment = {
                "path": item["path"],
                "line": item["line"],
                "side": "RIGHT",
                "body": decorated,
            }
            if item.get("start_line"):
                comment["start_line"] = item["start_line"]
                comment["start_side"] = "RIGHT"
            inline.append(comment)
        else:
            where = f"{item['path']}:{item['line']}" if item["line"] else item["path"]
            orphans.append(f"- **`{where}`** — {decorated}")

    summary = build_summary(
        staged=staged,
        inline=inline,
        orphans=orphans,
        previous=earlier,
        statuses=statuses,
    )

    payload = {
        "commit_id": commit_sha,
        "body": summary,
        "event": "COMMENT",
        "comments": inline,
    }
    Path(out_path).write_text(json.dumps(payload))

    fixable = [
        findings.fix_payload(
            fid=item["id"],
            path=item["path"],
            line=item["line"],
            body=item["body"],
            bot_name=ctx["bot_name"],
            pr_number=ctx["pr_number"],
        )
        for item in staged
        if not item.get("suggestion")
    ]
    if fixable_path:
        Path(fixable_path).write_text(json.dumps(fixable))

    replies = previous_mod.build_replies(earlier, statuses, commit_sha)
    if replies_path:
        Path(replies_path).write_text(json.dumps(replies))

    print(
        f"{len(inline)} inline, {len(orphans)} in summary, {len(fixable)} fix PRs, "
        f"{sum(1 for item in staged if item.get('suggestion'))} suggestions, "
        f"{len(earlier)} rechecked, {len(replies)} replies."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
