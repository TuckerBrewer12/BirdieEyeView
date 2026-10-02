#!/usr/bin/env python3
"""Slop Control: one pass/fail PR comment, and the prompt for one fix PR.

CLI:
    slop_report.py guide
    slop_report.py prepare --findings F --diff D --report R --prompt P
    slop_report.py comment --report R [--fix-url URL] [--compare-url URL]
    slop_report.py pr-body
    slop_report.py field --report R --name verdict|branch
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

_BOTS = Path(__file__).resolve().parent
if str(_BOTS) not in sys.path:
    sys.path.insert(0, str(_BOTS))

import findings
import post_review
import previous

MARKER = "<!-- slop-control-bot -->"
PROMPT_PATH = _BOTS / "slop-control.md"
GUIDE_RE = re.compile(r"<!-- guide:start -->\s*(.*?)\s*<!-- guide:end -->", re.DOTALL)
MAX_GUIDE = 300


def bot_name() -> str:
    return os.environ.get("BOT_NAME", "🧹 Slop Control")


def guide_text() -> str:
    """The comment standard. One paragraph, under 300 characters."""
    match = GUIDE_RE.search(PROMPT_PATH.read_text())
    if not match:
        raise SystemExit(f"{PROMPT_PATH.name} is missing the comment guide markers.")
    guide = match.group(1).strip()
    if "\n" in guide or len(guide) >= MAX_GUIDE:
        raise SystemExit(
            f"Comment guide must be one paragraph under {MAX_GUIDE} characters "
            f"(got {len(guide)})."
        )
    return guide


def fix_branch(pr_number: str) -> str:
    return f"{findings.BRANCH_PREFIX}/pr-{pr_number}/slop"


def _one_line(text: str) -> str:
    return " ".join((text or "").split())


def _location(item: dict) -> str:
    path = item["path"]
    line = item["line"]
    start = item.get("start_line")
    if isinstance(start, int) and start != line:
        return f"{path}:{start}-{line}"
    return f"{path}:{line}"


def normalize_findings(raw: list[object], valid: dict[str, set[int]]) -> list[dict]:
    """Keep findings anchored to a line this diff adds."""
    staged: list[dict] = []
    seen: set[tuple[str, int]] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        path = item.get("path")
        line = item.get("line")
        body = _one_line(str(item.get("body") or ""))
        if not path or not isinstance(line, int) or not body:
            continue
        if line not in valid.get(str(path), set()):
            continue
        key = (str(path), line)
        if key in seen:
            continue
        seen.add(key)

        replacement = str(item.get("replacement") or "").strip()
        action = str(item.get("action") or "").strip().lower()
        if action in {"remove", "drop"}:
            action = "delete"
        if action not in {"delete", "shorten"}:
            action = "shorten" if replacement else "delete"
        if action == "delete":
            replacement = ""

        start = item.get("start_line")
        start_line = None
        if isinstance(start, int) and start < line:
            span = range(start, line + 1)
            if all(n in valid.get(str(path), set()) for n in span):
                start_line = start

        staged.append(
            {
                "path": str(path),
                "line": line,
                "start_line": start_line,
                "action": action,
                "text": str(item.get("text") or "").strip(),
                "replacement": replacement,
                "body": body,
            }
        )
    return staged


def _pr_link(url: str) -> str:
    number = url.rstrip("/").rsplit("/", 1)[-1]
    if number.isdigit():
        return f"[#{number}]({url})"
    return url


def render_comment(
    items: list[dict],
    *,
    fix_url: str = "",
    compare_url: str = "",
) -> str:
    """The only comment this bot leaves on a PR."""
    lines = [MARKER, f"### {bot_name()}", ""]
    if not items:
        lines.append("✅ Pass. Comments in this diff are only where they are necessary.")
    else:
        noun = "comment" if len(items) == 1 else "comments"
        lines.append(f"❌ Fail. {len(items)} {noun} should be removed or shortened.")
        lines.append("")
        for item in items:
            lines.append(f"- `{_location(item)}` — {item['body']}")
        lines.append("")
        if fix_url:
            lines.append(
                f"Opened {_pr_link(fix_url)} with every comment fix. "
                "Merge it into this branch if it looks right."
            )
        elif compare_url:
            lines.append(
                "Pushed the comment fixes but could not open a PR. "
                f"[Open it here]({compare_url})."
            )
        else:
            lines.append("A fix PR was not opened. Re-run the Slop Control check to retry.")
    return "\n".join(lines) + "\n"


def _fenced(text: str) -> str:
    fence = "````" if "```" in text else "```"
    return f"{fence}\n{text.rstrip()}\n{fence}"


def build_fix_prompt(items: list[dict]) -> str:
    blocks = [
        "You are applying Slop Control findings in this repository.",
        "",
        "Comment guide:",
        guide_text(),
        "",
        "Edit only the comments named below. Delete a comment, or replace it",
        "with the shortened text. Do not change code, names, or surrounding",
        "formatting. Do not commit, push, or run git. If a comment is already",
        "gone, leave that file alone. When a shorten finding has no replacement,",
        "cut the comment to the one fact named in Why, or delete it if that",
        "fact is not there.",
        "",
        "## Findings",
        "",
    ]
    for index, item in enumerate(items, start=1):
        blocks.append(f"{index}. `{_location(item)}` — {item['action']}")
        if item.get("text"):
            blocks.append(_fenced(item["text"]))
        if item["action"] == "shorten" and item.get("replacement"):
            blocks.append("Replace it with exactly:")
            blocks.append(_fenced(item["replacement"]))
        blocks.append(f"Why: {item['body']}")
        blocks.append("")
    return "\n".join(blocks).rstrip() + "\n"


def render_pr_body(pr_number: str) -> str:
    return (
        "## What?\n\n"
        f"Trims every comment Slop Control flagged on #{pr_number}.\n\n"
        "## Why?\n\n"
        "Those comments restate the code, define an obvious token or type, or "
        f"explain something that is absent. Merge this to take the cleanup as a commit on #{pr_number}.\n"
    )


def prepare(findings_path: Path, diff: str, report_path: Path, prompt_path: Path) -> int:
    pr_number = os.environ.get("PR_NUMBER", "")
    if not pr_number:
        print("::error title=Slop Control::PR_NUMBER is not set.", file=sys.stderr)
        return 1

    raw = findings_path.read_text()
    try:
        parsed, _status, _used_object = post_review.parse_model_output(raw)
    except (ValueError, json.JSONDecodeError) as exc:
        detail = " ".join(raw.split())[:200] or "(no output)"
        print(f"::error title={bot_name()}::no JSON in model output ({exc}): {detail}", file=sys.stderr)
        return 1

    items = normalize_findings(parsed, post_review.added_lines(diff))
    report = {
        "verdict": "fail" if items else "pass",
        "branch": fix_branch(pr_number),
        "findings": items,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    if items:
        prompt_path.write_text(build_fix_prompt(items))
    elif prompt_path.exists():
        prompt_path.unlink()
    print(f"{report['verdict']}: {len(items)} comment(s).")
    return 0


def gh_api(args: list[str], *, input_text: str | None = None) -> str:
    result = subprocess.run(
        ["gh", "api", *args],
        input=input_text,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit(result.returncode)
    return result.stdout


def upsert_comment(body: str) -> None:
    repo = os.environ["GITHUB_REPOSITORY"]
    pr = os.environ["PR_NUMBER"]
    raw = gh_api(["--paginate", f"repos/{repo}/issues/{pr}/comments"])
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as handle:
        handle.write(raw)
        path = Path(handle.name)
    try:
        comments = previous.load_json_list(path)
    finally:
        path.unlink(missing_ok=True)
    existing = next((item for item in comments if MARKER in (item.get("body") or "")), None)

    payload = json.dumps({"body": body})
    if existing:
        gh_api(
            ["-X", "PATCH", f"repos/{repo}/issues/comments/{existing['id']}", "--input", "-"],
            input_text=payload,
        )
        print(f"Updated comment {existing['id']}.")
    else:
        gh_api(
            ["-X", "POST", f"repos/{repo}/issues/{pr}/comments", "--input", "-"],
            input_text=payload,
        )
        print("Posted Slop Control comment.")


def _load_report(path: str) -> dict:
    data = json.loads(Path(path).read_text())
    if not isinstance(data, dict):
        raise SystemExit("report is not an object")
    return data


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("guide")
    sub.add_parser("pr-body")

    prepare_cmd = sub.add_parser("prepare")
    prepare_cmd.add_argument("--findings", required=True)
    prepare_cmd.add_argument("--diff", required=True)
    prepare_cmd.add_argument("--report", required=True)
    prepare_cmd.add_argument("--prompt", required=True)

    comment_cmd = sub.add_parser("comment")
    comment_cmd.add_argument("--report", required=True)
    comment_cmd.add_argument("--fix-url", default="")
    comment_cmd.add_argument("--compare-url", default="")

    field_cmd = sub.add_parser("field")
    field_cmd.add_argument("--report", required=True)
    field_cmd.add_argument("--name", required=True)

    args = parser.parse_args()
    if args.cmd == "guide":
        print(guide_text())
        return 0
    if args.cmd == "pr-body":
        pr_number = os.environ.get("PR_NUMBER", "")
        if not pr_number:
            print("PR_NUMBER is not set.", file=sys.stderr)
            return 1
        sys.stdout.write(render_pr_body(pr_number))
        return 0
    if args.cmd == "prepare":
        return prepare(
            Path(args.findings),
            Path(args.diff).read_text(),
            Path(args.report),
            Path(args.prompt),
        )
    if args.cmd == "field":
        value = _load_report(args.report)[args.name]
        print(value)
        return 0
    report = _load_report(args.report)
    upsert_comment(
        render_comment(
            report.get("findings") or [],
            fix_url=args.fix_url,
            compare_url=args.compare_url,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
