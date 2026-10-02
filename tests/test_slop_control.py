from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BOTS = ROOT / ".github" / "review-bots"
if str(BOTS) not in sys.path:
    sys.path.insert(0, str(BOTS))

import slop_report

DIFF = """\
diff --git a/frontend/src/theme/colors.ts b/frontend/src/theme/colors.ts
--- /dev/null
+++ b/frontend/src/theme/colors.ts
@@ -0,0 +1,4 @@
+// primary is the brand green
+export const primary = "#2d7a3a"
+// Scanner drops the socket; keep the budget, drop the rest of this sentence.
+export const retries = 3
"""

DELETE = {
    "path": "frontend/src/theme/colors.ts",
    "line": 1,
    "text": "// primary is the brand green",
    "action": "delete",
    "body": "Defines a token the name already gives. Delete it.",
}
SHORTEN = {
    "path": "frontend/src/theme/colors.ts",
    "line": 3,
    "text": "// Scanner drops the socket; keep the budget, drop the rest of this sentence.",
    "action": "shorten",
    "replacement": "// Scanner drops the socket; three attempts is the budget.",
    "body": "The socket-drop budget is the part worth keeping. Cut the rest.",
}


@pytest.fixture
def pr_env(monkeypatch):
    monkeypatch.setenv("PR_NUMBER", "42")
    monkeypatch.setenv("BOT_NAME", "🧹 Slop Control")
    monkeypatch.setenv("GITHUB_REPOSITORY", "owner/birdie")


def test_guide_is_one_paragraph_under_300_characters():
    guide = slop_report.guide_text()
    assert guide
    assert "\n" not in guide
    assert len(guide) < 300


def test_normalize_keeps_added_lines_and_infers_delete():
    valid = slop_report.post_review.added_lines(DIFF)
    raw = [
        DELETE,
        SHORTEN,
        {**DELETE, "line": 1, "body": "Duplicate of the token gloss."},
        {"path": "frontend/src/theme/colors.ts", "line": 99, "body": "Not in the diff."},
        {"path": "frontend/src/theme/colors.ts", "line": 2, "action": "remove", "body": "Narrates the export."},
        "nope",
    ]
    items = slop_report.normalize_findings(raw, valid)
    assert [(item["line"], item["action"]) for item in items] == [
        (1, "delete"),
        (3, "shorten"),
        (2, "delete"),
    ]
    assert items[0]["replacement"] == ""
    assert items[1]["replacement"].startswith("// Scanner")


def test_prepare_pass_has_no_findings(tmp_path, pr_env):
    findings = tmp_path / "findings.json"
    findings.write_text("[]")
    report = tmp_path / "report.json"
    assert slop_report.prepare(findings, DIFF, report) == 0
    payload = json.loads(report.read_text())
    assert payload["verdict"] == "pass"
    assert payload["findings"] == []
    assert payload["branch"] == "bot-fix/pr-42/slop"


def test_prepare_fail_filters_to_added_lines(tmp_path, pr_env):
    findings = tmp_path / "findings.json"
    findings.write_text(json.dumps([DELETE, {"path": "missing.ts", "line": 1, "body": "Off diff."}]))
    report = tmp_path / "report.json"
    assert slop_report.prepare(findings, DIFF, report) == 0
    payload = json.loads(report.read_text())
    assert payload["verdict"] == "fail"
    assert len(payload["findings"]) == 1
    text = slop_report.build_fix_prompt(payload["findings"])
    assert slop_report.guide_text() in text
    assert "frontend/src/theme/colors.ts:1" in text
    assert "missing.ts" not in text
    assert "delete" in text


def test_prepare_rejects_prose(tmp_path, pr_env):
    findings = tmp_path / "findings.json"
    findings.write_text("The comments look noisy.")
    report = tmp_path / "report.json"
    assert slop_report.prepare(findings, DIFF, report) == 1
    assert not report.exists()


def test_pass_comment_is_a_single_pass_report():
    body = slop_report.render_comment([])
    assert body.startswith(slop_report.MARKER)
    assert body.count(slop_report.MARKER) == 1
    assert "✅ Pass." in body
    assert "Fail" not in body
    assert "Opened" not in body
    assert "<!-- review-bot:" not in body


def test_fail_comment_lists_every_finding_and_one_fix_link():
    items = slop_report.normalize_findings([DELETE, SHORTEN], slop_report.post_review.added_lines(DIFF))
    url = "https://github.com/owner/birdie/pull/99"
    body = slop_report.render_comment(items, fix_url=url)
    assert body.count(slop_report.MARKER) == 1
    assert "❌ Fail. 2 comments should be removed or shortened." in body
    assert "`frontend/src/theme/colors.ts:1`" in body
    assert "`frontend/src/theme/colors.ts:3`" in body
    assert f"[#99]({url})" in body
    assert body.count(url) == 1
    assert "<!-- review-bot:" not in body


def test_fail_comment_while_the_fix_job_runs():
    body = slop_report.render_comment([DELETE], pending=True)
    assert "❌ Fail. 1 comment should be removed or shortened." in body
    assert "Opening a fix PR." in body
    assert "Re-run" not in body


def test_fail_comment_without_a_pull_request_says_retry():
    body = slop_report.render_comment([DELETE])
    assert "❌ Fail. 1 comment should be removed or shortened." in body
    assert "A fix PR was not opened. Re-run the Slop Control check to retry." in body


def test_fail_comment_uses_compare_url_when_create_fails():
    compare = "https://github.com/owner/birdie/compare/feature...bot-fix/pr-42/slop?expand=1"
    body = slop_report.render_comment([DELETE], compare_url=compare)
    assert f"[Open it here]({compare})" in body
    assert "Opened" not in body


def test_fix_prompt_quotes_the_shortened_comment():
    items = slop_report.normalize_findings([SHORTEN], slop_report.post_review.added_lines(DIFF))
    prompt = slop_report.build_fix_prompt(items)
    assert "shorten" in prompt
    assert "// Scanner drops the socket; three attempts is the budget." in prompt
    assert "Do not commit" in prompt


def test_pr_body_follows_the_template():
    body = slop_report.render_pr_body("42")
    assert body.startswith("## What?\n")
    assert "## Why?\n" in body
    assert "#42" in body
