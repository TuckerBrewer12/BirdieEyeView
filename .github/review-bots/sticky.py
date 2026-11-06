"""The one PR comment a bot keeps up to date, found by a hidden marker."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import previous


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


def upsert_comment(marker: str, body: str) -> None:
    """Edit the PR comment containing `marker`, or post `body` as a new one."""
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
    existing = next((c for c in comments if marker in (c.get("body") or "")), None)

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
        print("Posted comment.")
