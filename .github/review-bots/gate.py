#!/usr/bin/env python3
# Usage: gate.py PATHSPEC...
# Env: GITHUB_REPOSITORY GITHUB_WORKFLOW_REF GITHUB_OUTPUT GH_TOKEN BASE_SHA HEAD_SHA HEAD_REF
from __future__ import annotations

import os
import subprocess
import sys


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(["git", *args], capture_output=True, check=False)


def last_success(repo: str, workflow: str, branch: str) -> str:
    result = subprocess.run(
        [
            "gh", "api", "-X", "GET", f"repos/{repo}/actions/workflows/{workflow}/runs",
            "-f", "event=pull_request", "-f", f"branch={branch}", "-f", "status=success", "-f", "per_page=1",
            "--jq", ".workflow_runs[0].head_sha // empty",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout.strip()


def has_commit(sha: str) -> bool:
    if git("cat-file", "-e", f"{sha}^{{commit}}").returncode == 0:
        return True
    return git("fetch", "-q", "origin", sha).returncode == 0


def pr_diff(base: str, head: str, pathspec: list[str]) -> bytes | None:
    fork = git("merge-base", base, head)
    if fork.returncode:
        return None
    diff = git("diff", "--binary", fork.stdout.decode().strip(), head, "--", *pathspec)
    return None if diff.returncode else diff.stdout


def unchanged_since(last: str, base: str, head: str, pathspec: list[str]) -> bool:
    if not last or not has_commit(last):
        return False
    before = pr_diff(base, last, pathspec)
    return before is not None and before == pr_diff(base, head, pathspec)


def main() -> int:
    workflow = os.environ["GITHUB_WORKFLOW_REF"].split("@", 1)[0].rsplit("/", 1)[1]
    last = last_success(os.environ["GITHUB_REPOSITORY"], workflow, os.environ["HEAD_REF"])
    skip = unchanged_since(last, os.environ["BASE_SHA"], os.environ["HEAD_SHA"], sys.argv[1:])
    if skip:
        print(f"Nothing under {' '.join(sys.argv[1:])} changed since the last run on {last[:7]}; skipping.")
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as fh:
        fh.write(f"skip={'true' if skip else 'false'}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
