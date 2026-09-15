#!/usr/bin/env python3
"""Finding identity, comment markup, and the payload the fix job consumes.

CLI:
    findings.py fields              # FINDING_JSON -> shell-quotable KEY=value
    findings.py prompt              # FINDING_JSON -> opencode prompt
    findings.py from-comment        # COMMENT_BODY [PARENT_BODY] -> fix payload JSON
    findings.py parse-meta          # stdin comment body -> JSON metadata or {}
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shlex
import sys
from pathlib import Path
from typing import Any

_BOTS = Path(__file__).resolve().parent
if str(_BOTS) not in sys.path:
    sys.path.insert(0, str(_BOTS))

import links

BRANCH_PREFIX = "bot-fix"

META_RE = re.compile(r"<!-- review-bot:(\{.*?\}) -->", re.DOTALL)


def finding_id(path: str, body: str) -> str:
    """Stable across line-number shifts so a synchronize does not open a second PR."""
    return hashlib.sha1(f"{path}\n{body.strip()}".encode()).hexdigest()[:8]


def metadata_blob(
    *,
    finding_id: str,
    path: str,
    line: object,
    bot_name: str,
) -> str:
    payload = {
        "id": finding_id,
        "path": path,
        "line": line if isinstance(line, int) else None,
        "bot": bot_name,
    }
    return f"<!-- review-bot:{json.dumps(payload, separators=(',', ':'))} -->"


def parse_metadata(body: str) -> dict[str, Any] | None:
    match = META_RE.search(body or "")
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def is_fix_command(body: str) -> bool:
    """True when the comment *is* a /fix command, not a bot note that mentions it."""
    text = (body or "").strip()
    if not text:
        return False
    first = text.split()[0]
    return first == "/fix"


def decorate_body(
    *,
    body: str,
    path: str,
    line: object,
    repo: str,
    pr_number: str,
    pr_url: str,
    bot_name: str,
) -> tuple[str, str]:
    """Return (comment markdown, finding id)."""
    fid = finding_id(path, body)
    prompt = links.discussion_prompt(
        repo=repo,
        pr_number=str(pr_number),
        pr_url=pr_url,
        bot_name=bot_name,
        path=path,
        line=line,
        body=body,
    )
    actions = links.comment_actions(links.conductor_url(prompt))
    meta = metadata_blob(
        finding_id=fid,
        path=path,
        line=line,
        bot_name=bot_name,
    )
    return f"{body.strip()}\n\n{actions}\n\n{meta}", fid


def branch_name(pr_number: str | int, fid: str) -> str:
    return f"{BRANCH_PREFIX}/pr-{pr_number}/{fid}"


def title_for(body: str, path: str) -> str:
    first = body.strip().splitlines()[0] if body.strip() else path
    if len(first) > 72:
        first = first[:71] + "…"
    return first


def fix_payload(
    *,
    fid: str,
    path: str,
    line: object,
    body: str,
    bot_name: str,
    pr_number: str,
) -> dict[str, Any]:
    return {
        "id": fid,
        "title": title_for(body, path),
        "path": path,
        "line": line if isinstance(line, int) else 0,
        "body": body.strip(),
        "bot_name": bot_name,
        "branch": branch_name(pr_number, fid),
    }


def build_prompt(finding: dict[str, Any]) -> str:
    where = finding.get("path") or ""
    line = finding.get("line")
    if line:
        where = f"{where}:{line}"
    body = (finding.get("body") or "").strip()
    template = (_BOTS / "fix.md").read_text()
    return f"{template.rstrip()}\n\n## The finding\n\nFile: `{where}`\n\n{body}\n"


def _env_context() -> dict[str, str]:
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    pr_number = os.environ.get("PR_NUMBER", "")
    pr_url = os.environ.get("PR_URL") or (
        f"https://github.com/{repo}/pull/{pr_number}" if repo and pr_number else ""
    )
    return {
        "repo": repo,
        "pr_number": pr_number,
        "pr_url": pr_url,
        "bot_name": os.environ.get("BOT_NAME", "Review Bot"),
    }


def cmd_fields() -> int:
    finding = json.loads(os.environ["FINDING_JSON"])
    env = {
        "FINDING_ID": finding["id"],
        "FINDING_TITLE": finding.get("title") or "",
        "FINDING_PATH": finding.get("path") or "",
        "FINDING_LINE": str(finding.get("line") or ""),
        "FINDING_BODY": finding.get("body") or "",
        "BRANCH": finding.get("branch") or "",
        "BOT_NAME": finding.get("bot_name") or "Review Bot",
    }
    for key, value in env.items():
        print(f"{key}={shlex.quote(str(value))}")
    return 0


def cmd_prompt() -> int:
    finding = json.loads(os.environ["FINDING_JSON"])
    sys.stdout.write(build_prompt(finding))
    return 0


def cmd_parse_meta() -> int:
    meta = parse_metadata(sys.stdin.read())
    json.dump(meta or {}, sys.stdout)
    print()
    return 0


def cmd_from_comment() -> int:
    """Build a one-element fix payload from a `/fix` reply."""
    body = os.environ.get("COMMENT_BODY", "")
    parent = os.environ.get("PARENT_BODY", "")
    if not is_fix_command(body):
        json.dump([], sys.stdout)
        print()
        return 0

    meta = parse_metadata(parent or body)
    if not meta:
        json.dump([], sys.stdout)
        print()
        return 0

    ctx = _env_context()
    path = str(meta.get("path") or "")
    finding_body = _body_without_markup(parent or body)
    fid = str(meta.get("id") or finding_id(path, finding_body))
    payload = fix_payload(
        fid=fid,
        path=path,
        line=meta.get("line"),
        body=finding_body,
        bot_name=str(meta.get("bot") or ctx["bot_name"]),
        pr_number=ctx["pr_number"],
    )
    json.dump([payload], sys.stdout)
    print()
    return 0


def _body_without_markup(comment: str) -> str:
    """Strip the footer/metadata so the fix bot sees the original finding text."""
    text = META_RE.sub("", comment).strip()
    marker = f"[{links.DISCUSS_LABEL}]("
    idx = text.find(marker)
    if idx != -1:
        text = text[:idx].strip()
    return text


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__, file=sys.stderr)
        return 2
    command = args[0]
    if command == "fields":
        return cmd_fields()
    if command == "prompt":
        return cmd_prompt()
    if command == "parse-meta":
        return cmd_parse_meta()
    if command == "from-comment":
        return cmd_from_comment()
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
