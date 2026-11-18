from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BOTS = ROOT / ".github" / "review-bots"
if str(BOTS) not in sys.path:
    sys.path.insert(0, str(BOTS))

import comment_guard

TYPESCRIPT = os.environ.get("TYPESCRIPT_MODULE") or str(ROOT / "frontend" / "node_modules" / "typescript")
needs_typescript = pytest.mark.skipif(
    shutil.which("node") is None or not Path(TYPESCRIPT).is_dir(),
    reason="needs node and the frontend's typescript",
)

BEFORE = """\
import os


def total(scores):
    \"\"\"Add up the scores.\"\"\"
    # Sum every hole.
    result = sum(scores)  # strokes
    return result  # noqa: RET504
"""
ALL_ADDED = set(range(1, 9))


def test_added_lines_reads_new_file_numbers():
    diff = (
        "diff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n"
        "@@ -3,0 +4,2 @@\n+x\n+y\n@@ -9 +11 @@\n-z\n+w\n"
        "diff --git a/gone.py b/gone.py\n--- a/gone.py\n+++ /dev/null\n@@ -1 +0,0 @@\n-q\n"
    )
    assert comment_guard.added_lines(diff) == {"a.py": {4, 5, 11}}


def test_deleting_added_comments_and_a_docstring_passes():
    after = BEFORE.replace('    """Add up the scores."""\n', "").replace("    # Sum every hole.\n", "")
    after = after.replace("  # strokes", "")
    assert comment_guard.review_edit("a.py", BEFORE, after, ALL_ADDED) is None


def test_a_comment_the_pr_did_not_add_stays():
    after = BEFORE.replace("    # Sum every hole.\n", "")
    assert comment_guard.review_edit("a.py", BEFORE, after, {7}) == "line 6 was not added by this pull request"


def test_changed_code_is_rejected():
    after = BEFORE.replace("sum(scores)", "sum(scores) + 1")
    assert comment_guard.review_edit("a.py", BEFORE, after, ALL_ADDED) == "line 7 was rewritten, not deleted"


def test_a_shortened_comment_is_rejected():
    after = BEFORE.replace("# Sum every hole.", "# Sum.")
    assert comment_guard.review_edit("a.py", BEFORE, after, ALL_ADDED) == "line 6 was rewritten, not deleted"


def test_a_directive_is_never_deleted():
    after = BEFORE.replace("  # noqa: RET504", "")
    assert comment_guard.review_edit("a.py", BEFORE, after, ALL_ADDED) == "a tool directive or licence line was deleted"


def test_a_docstring_that_is_the_whole_body_stays():
    before = 'class Repo:\n    def get(self):\n        """Fetch it."""\n'
    after = "class Repo:\n    def get(self):\n"
    assert comment_guard.review_edit("a.py", before, after, {1, 2, 3}) == "the edit does not parse"


def test_a_docstring_read_through_dunder_doc_stays():
    before = '"""Usage: run it."""\nprint(__doc__)\n'
    after = "print(__doc__)\n"
    assert comment_guard.review_edit("a.py", before, after, {1, 2}) == (
        "a docstring the code reads through `__doc__` was deleted"
    )


def test_other_languages_are_left_alone():
    assert comment_guard.review_edit("a.sql", "-- x\nSELECT 1;\n", "SELECT 1;\n", {1, 2}) == (
        "the bot only edits Python, TypeScript and JavaScript"
    )


@needs_typescript
def test_typescript_tokens_ignore_comments_but_not_code(monkeypatch):
    monkeypatch.setenv("TYPESCRIPT_MODULE", TYPESCRIPT)
    before = (
        "// Banner\n/** The card. */\nexport function Card() {\n  const tone = '#fff' // the colour\n"
        "  return (\n    <div>\n      {/* the body */}\n      <b>{tone}</b>\n    </div>\n  )\n}\n"
    )
    clean = before.replace("// Banner\n/** The card. */\n", "").replace(" // the colour", "").replace("      {/* the body */}\n", "")
    broken = before.replace("'#fff' // the colour", "'")
    changed = clean.replace("'#fff'", "'#000'")
    problems = comment_guard.script_problems(
        [
            {"path": "Card.tsx", "before": before, "after": clean},
            {"path": "Broken.tsx", "before": before, "after": broken},
            {"path": "Changed.tsx", "before": before, "after": changed},
        ]
    )
    assert problems == {"Broken.tsx": "the edit does not parse", "Changed.tsx": "code changed, not only comments"}


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout


def test_check_keeps_good_edits_and_reverts_the_rest(tmp_path, monkeypatch):
    git(tmp_path, "init", "-q")
    git(tmp_path, "config", "user.email", "t@example.com")
    git(tmp_path, "config", "user.name", "T")
    (tmp_path / "old.py").write_text("x = 1\n")
    git(tmp_path, "add", ".")
    git(tmp_path, "commit", "-qm", "base")
    base = git(tmp_path, "rev-parse", "HEAD").strip()
    (tmp_path / "old.py").write_text("x = 1\n# Set y.\ny = 2\n")
    (tmp_path / "new.py").write_text("# Narration.\nz = 3\n")
    git(tmp_path, "add", ".")
    git(tmp_path, "commit", "-qm", "pr")

    (tmp_path / "old.py").write_text("x = 1\ny = 2\n")
    (tmp_path / "new.py").write_text("z = 4\n")
    (tmp_path / "extra.py").write_text("w = 5\n")

    monkeypatch.chdir(tmp_path)
    report = tmp_path.parent / "guard.json"
    comment_guard.cmd_check(argparse.Namespace(base=base, report=str(report)))

    result = json.loads(report.read_text())
    assert result["accepted"] == [{"path": "old.py", "lines": 1}]
    assert result["rejected"] == [
        {"path": "extra.py", "reason": "the bot only deletes; it added a file"},
        {"path": "new.py", "reason": "line 1 was rewritten, not deleted"},
    ]
    assert (tmp_path / "new.py").read_text() == "# Narration.\nz = 3\n"
    assert not (tmp_path / "extra.py").exists()


def test_comment_is_one_line_and_the_reshapes():
    guard = {
        "accepted": [{"path": "a.py", "lines": 3}, {"path": "b.ts", "lines": 1}],
        "rejected": [{"path": "c.py", "reason": "code changed, not only comments"}],
    }
    reshapes = comment_guard.parse_reply(
        'Done.\n{"must_kill": [{"path": "src/a.py", "line": 4, "symbol": "fix_sign", "reason": "Name the rule."},'
        ' {"bad": 1}]}'
    )
    body = comment_guard.render_comment(guard, reshapes, commit="abcdef1234", repo="o/r", head="h")

    assert body == (
        f"{comment_guard.MARKER}\n"
        f"**{comment_guard.BOT_NAME}** deleted 4 comment lines in abcdef1."
        " Skipped 1 file it couldn't edit without touching code.\n"
        "\n"
        "Reshape so these need no comment:\n"
        "- [`a.py`](https://github.com/o/r/blob/h/src/a.py#L4) `fix_sign`: Name the rule.\n"
    )


def test_nothing_to_delete_says_so():
    body = comment_guard.render_comment({}, comment_guard.parse_reply("garbage"), commit="", repo="o/r", head="h")
    assert body == f"{comment_guard.MARKER}\n**{comment_guard.BOT_NAME}**: nothing to delete.\n"
