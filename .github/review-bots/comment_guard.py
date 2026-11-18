#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import difflib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

_BOTS = Path(__file__).resolve().parent
if str(_BOTS) not in sys.path:
    sys.path.insert(0, str(_BOTS))

from coverage_report import extract_object, upsert_comment

MARKER = "<!-- no-comments-bot -->"
BOT_NAME = "✂️ No Comments Bot"
PYTHON = (".py",)
SCRIPT = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")
DIRECTIVE = re.compile(
    r"eslint-(?:disable|enable)|@ts-(?:expect-error|ignore|nocheck|check)|prettier-ignore|biome-ignore"
    r"|\bnoqa\b|type:\s*ignore|pyright:|\bnosec\b|fmt:\s*(?:off|on|skip)|pragma:|(?:istanbul|c8|v8) ignore"
    r"|@vitest-environment|@jsx|/// <reference|^#!|coding[:=]|@license|SPDX-License-Identifier|copyright",
    re.IGNORECASE | re.MULTILINE,
)


def added_lines(diff: str) -> dict[str, set[int]]:
    added: dict[str, set[int]] = {}
    path = ""
    for line in diff.splitlines():
        if line.startswith("+++ "):
            path = line[6:] if line.startswith("+++ b/") else ""
            continue
        match = HUNK.match(line)
        if match and path:
            start, count = int(match.group(1)), int(match.group(2) or "1")
            added.setdefault(path, set()).update(range(start, start + count))
    return added


def python_code(source: str) -> str | None:
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return None
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            first = node.body[0] if node.body else None
            if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
                node.body = node.body[1:]
    return ast.dump(tree)


def scope_problem(before: list[str], after: list[str], added: set[int]) -> str | None:
    matcher = difflib.SequenceMatcher(a=before, b=after, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        untouchable = [i + 1 for i in range(i1, i2) if before[i].strip() and i + 1 not in added]
        if untouchable:
            return f"line {untouchable[0]} was not added by this pull request"
        originals = iter(line.rstrip() for line in before[i1:i2])
        for line in (line.rstrip() for line in after[j1:j2] if line.strip()):
            if not any(original.startswith(line) for original in originals):
                return f"line {j1 + 1} was rewritten, not deleted"
    return None


def review_edit(path: str, before: str, after: str, added: set[int]) -> str | None:
    if not path.endswith(PYTHON + SCRIPT):
        return "the bot only edits Python, TypeScript and JavaScript"
    if len(DIRECTIVE.findall(after)) < len(DIRECTIVE.findall(before)):
        return "a tool directive or licence line was deleted"
    problem = scope_problem(before.splitlines(), after.splitlines(), added)
    if problem:
        return problem
    if path.endswith(PYTHON):
        old, new = python_code(before), python_code(after)
        if old is None:
            return "the original does not parse"
        if new is None:
            return "the edit does not parse"
        if old != new:
            return "code changed, not only comments"
        if "__doc__" in before and ast.dump(ast.parse(before)) != ast.dump(ast.parse(after)):
            return "a docstring the code reads through `__doc__` was deleted"
    return None


def script_problems(pairs: list[dict[str, str]]) -> dict[str, str]:
    if not pairs:
        return {}
    result = subprocess.run(
        ["node", str(_BOTS / "code_tokens.cjs")],
        input=json.dumps(pairs),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        return {pair["path"]: "the TypeScript check could not run" for pair in pairs}
    return {item["path"]: item["reason"] for item in json.loads(result.stdout) if not item["same"]}


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True, errors="replace", check=True).stdout


def lines_touched(before: str, after: str) -> int:
    matcher = difflib.SequenceMatcher(a=before.splitlines(), b=after.splitlines(), autojunk=False)
    old = before.splitlines()
    return sum(1 for tag, i1, i2, _, _ in matcher.get_opcodes() if tag != "equal" for i in range(i1, i2) if old[i].strip())


def cmd_check(args: argparse.Namespace) -> int:
    added = added_lines(git("diff", "--unified=0", "--no-color", args.base, "HEAD"))
    rejected: dict[str, str] = {}
    edits: dict[str, tuple[str, str]] = {}

    for path in filter(None, git("ls-files", "--others", "--exclude-standard").splitlines()):
        Path(path).unlink()
        rejected[path] = "the bot only deletes; it added a file"
    for path in filter(None, git("diff", "--name-only").splitlines()):
        before = git("show", f"HEAD:{path}")
        if not Path(path).is_file():
            rejected[path] = "the bot only deletes comments; it deleted the file"
            continue
        after = Path(path).read_text()
        problem = review_edit(path, before, after, added.get(path, set()))
        if problem:
            rejected[path] = problem
        else:
            edits[path] = (before, after)

    scripts = [{"path": p, "before": b, "after": a} for p, (b, a) in edits.items() if p.endswith(SCRIPT)]
    for path, problem in script_problems(scripts).items():
        rejected[path] = problem
        edits.pop(path)

    for path in rejected:
        subprocess.run(["git", "checkout", "HEAD", "--", path], capture_output=True, check=False)

    report = {
        "accepted": [{"path": p, "lines": lines_touched(b, a)} for p, (b, a) in sorted(edits.items())],
        "rejected": [{"path": p, "reason": r} for p, r in sorted(rejected.items())],
    }
    Path(args.report).write_text(json.dumps(report, indent=2))
    for item in report["rejected"]:
        print(f"- `{item['path']}`: {item['reason']}")
    return 0


def parse_reply(text: str) -> list[dict]:
    try:
        data = json.loads(extract_object(text) or "{}")
    except json.JSONDecodeError:
        data = {}
    items = data.get("must_kill") if isinstance(data, dict) else None
    return [i for i in items or [] if isinstance(i, dict) and i.get("path")]


def render_comment(guard: dict, reshapes: list[dict], *, commit: str, repo: str, head: str) -> str:
    lines = sum(item["lines"] for item in guard.get("accepted") or [])
    skipped = len(guard.get("rejected") or [])
    summary = f"**{BOT_NAME}** deleted {lines} comment line{'s' * (lines != 1)} in {commit[:7]}." if commit else (
        f"**{BOT_NAME}**: nothing to delete."
    )
    if skipped:
        summary += f" Skipped {skipped} file{'s' * (skipped != 1)} it couldn't edit without touching code."
    body = [MARKER, summary]
    if reshapes:
        body += ["", "Reshape so these need no comment:"]
        for item in reshapes:
            path, line = item["path"], item.get("line")
            link = f"https://github.com/{repo}/blob/{head}/{path}" + (f"#L{line}" if line else "")
            body.append(f"- [`{Path(path).name}`]({link}) `{item.get('symbol')}`: {item.get('reason', '')}")
    return "\n".join(body) + "\n"


def cmd_comment(args: argparse.Namespace) -> int:
    guard = json.loads(Path(args.guard).read_text()) if Path(args.guard).is_file() else {}
    items = [i for p in args.reply if Path(p).is_file() for i in parse_reply(Path(p).read_text())]
    reshapes = list({(i["path"], i.get("symbol")): i for i in items}.values())
    repo = os.environ["GITHUB_REPOSITORY"]
    body = render_comment(guard, reshapes, commit=args.commit, repo=repo, head=os.environ["HEAD_SHA"])
    upsert_comment(body, MARKER, create=bool(reshapes or guard.get("rejected")))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    check = sub.add_parser("check")
    check.add_argument("--base", required=True)
    check.add_argument("--report", required=True)
    check.set_defaults(func=cmd_check)

    comment = sub.add_parser("comment")
    comment.add_argument("--guard", required=True)
    comment.add_argument("--reply", action="append", default=[])
    comment.add_argument("--commit", default="")
    comment.set_defaults(func=cmd_comment)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
