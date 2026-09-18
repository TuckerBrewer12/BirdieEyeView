from __future__ import annotations

import io
import json
import sys
from contextlib import redirect_stdout
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BOTS = ROOT / ".github" / "review-bots"
if str(BOTS) not in sys.path:
    sys.path.insert(0, str(BOTS))

import findings
import links
import post_review
import previous


DIFF = """\
diff --git a/frontend/src/brand/components/Badge.tsx b/frontend/src/brand/components/Badge.tsx
--- /dev/null
+++ b/frontend/src/brand/components/Badge.tsx
@@ -0,0 +1,4 @@
+export function Badge() {
+  return <span className="text-[#2d7a3a]">x</span>
+}
+
"""


@pytest.fixture
def bot_env(monkeypatch):
    monkeypatch.setenv("BOT_NAME", "Brand Kit Bot")
    monkeypatch.setenv("GITHUB_REPOSITORY", "owner/birdie")
    monkeypatch.setenv("PR_NUMBER", "42")
    monkeypatch.setenv("PR_URL", "https://github.com/owner/birdie/pull/42")
    monkeypatch.setenv("HEAD_SHA", "abc123def")
    monkeypatch.setattr(post_review, "BOT_NAME", "Brand Kit Bot")


def test_finding_id_ignores_line_number():
    a = findings.finding_id("a.tsx", "use a token")
    b = findings.finding_id("a.tsx", "use a token")
    c = findings.finding_id("a.tsx", "different")
    assert a == b
    assert a != c


def test_comment_round_trip_metadata(bot_env):
    body, fid = findings.decorate_body(
        body="Add a preview for Badge.",
        path="frontend/src/brand/components/Badge.tsx",
        line=1,
        repo="owner/birdie",
        pr_number="42",
        pr_url="https://github.com/owner/birdie/pull/42",
        bot_name="Brand Kit Bot",
    )
    assert "Discuss in Conductor" in body
    assert "conductor://prompt=" in body
    assert "agent=cursor" in body
    assert "model=grok-4.6" in body
    assert "open a PR with this change" in body
    meta = findings.parse_metadata(body)
    assert meta is not None
    assert meta["id"] == fid
    assert meta["path"].endswith("Badge.tsx")
    assert meta["line"] == 1
    assert "recipe" not in meta
    stripped = findings._body_without_markup(body)
    assert stripped == "Add a preview for Badge."
    assert "Discuss" not in stripped


def test_is_fix_command_does_not_match_bot_footer():
    footer = "Opening a PR with this change. Reply `/fix` to retry."
    assert findings.is_fix_command("/fix") is True
    assert findings.is_fix_command("/fix please") is True
    assert findings.is_fix_command(footer) is False
    assert findings.is_fix_command("please /fix this") is False


def test_extract_array_survives_chrome():
    raw = 'session start\n```json\n[{"path": "a.tsx", "line": 1, "body": "x"}]\n```\ndone'
    assert json.loads(post_review.extract_array(raw)) == [
        {"path": "a.tsx", "line": 1, "body": "x"}
    ]


def test_added_lines_from_new_file():
    lines = post_review.added_lines(DIFF)
    assert "frontend/src/brand/components/Badge.tsx" in lines
    assert lines["frontend/src/brand/components/Badge.tsx"] == {1, 2, 3, 4}


def test_post_review_writes_fixable_payload_for_every_finding(tmp_path, bot_env, monkeypatch):
    findings_path = tmp_path / "findings.json"
    findings_path.write_text(
        json.dumps(
            [
                {
                    "path": "frontend/src/brand/components/Badge.tsx",
                    "line": 1,
                    "body": "New kit component with no screenshot coverage.",
                },
                {
                    "path": "frontend/src/brand/components/Badge.tsx",
                    "line": 2,
                    "body": "`#2d7a3a` should be `text-primary`.",
                },
            ]
        )
    )
    diff_path = tmp_path / "diff.patch"
    diff_path.write_text(DIFF)
    out_path = tmp_path / "review.json"
    fixable_path = tmp_path / "fixable.json"

    monkeypatch.setattr(
        post_review.sys,
        "argv",
        [
            "post_review.py",
            str(findings_path),
            str(diff_path),
            "abc123def",
            str(out_path),
            str(fixable_path),
        ],
    )
    assert post_review.main() == 0

    review = json.loads(out_path.read_text())
    assert review["event"] == "COMMENT"
    assert len(review["comments"]) == 2
    assert "Discuss in Conductor" in review["comments"][0]["body"]
    assert "recipe" not in review["comments"][0]["body"]

    fixable = json.loads(fixable_path.read_text())
    assert len(fixable) == 2
    assert fixable[0]["branch"].startswith("bot-fix/pr-42/")
    assert "recipe" not in fixable[0]
    assert "fix PR" in review["body"]


def test_from_comment_builds_payload(monkeypatch, bot_env):
    original, fid = findings.decorate_body(
        body="Swap this button for the kit Button.",
        path="frontend/src/pages/rounds/RoundsPage.tsx",
        line=10,
        repo="owner/birdie",
        pr_number="42",
        pr_url="https://github.com/owner/birdie/pull/42",
        bot_name="Brand Kit Bot",
    )
    monkeypatch.setenv("COMMENT_BODY", "/fix")
    monkeypatch.setenv("PARENT_BODY", original)
    monkeypatch.setenv("PR_NUMBER", "42")
    buf = io.StringIO()
    with redirect_stdout(buf):
        assert findings.cmd_from_comment() == 0
    payload = json.loads(buf.getvalue())
    assert len(payload) == 1
    assert payload[0]["id"] == fid
    assert payload[0]["body"] == "Swap this button for the kit Button."
    assert "recipe" not in payload[0]


def test_from_comment_ignores_non_command(monkeypatch):
    monkeypatch.setenv("COMMENT_BODY", "Opening a PR. Reply `/fix` to retry.")
    monkeypatch.setenv("PARENT_BODY", "")
    buf = io.StringIO()
    with redirect_stdout(buf):
        assert findings.cmd_from_comment() == 0
    assert json.loads(buf.getvalue()) == []


def test_discussion_prompt_truncates():
    prompt = links.discussion_prompt(
        repo="o/r",
        pr_number="1",
        pr_url="https://example.test/1",
        bot_name="Bot",
        path="a.tsx",
        line=1,
        body="x" * 5000,
    )
    assert len(prompt) <= links.MAX_PROMPT
    assert prompt.endswith("…")
    url = links.conductor_url(prompt)
    assert url.startswith("conductor://prompt=")
    assert "agent=cursor" in url
    assert "model=grok-4.6" in url


def test_build_prompt_is_just_the_finding():
    payload = findings.fix_payload(
        fid="deadbeef",
        path="frontend/src/brand/components/Badge.tsx",
        line=1,
        body="Add a preview.",
        bot_name="Brand Kit Bot",
        pr_number="42",
    )
    prompt = findings.build_prompt(payload)
    assert "Add a preview." in prompt
    assert "recipe" not in prompt.lower()
    assert "Tailwind" in prompt
    assert payload["title"]


def test_rephrased_brand_kit_finding_is_the_same_issue():
    earlier = {
        "id": "aaa11111",
        "path": "frontend/src/pages/dashboard/MobileDashboard.tsx",
        "line": 671,
        "body": "`#e5e7eb` is `chartColors.muted` (`--chart-muted`). Use the brand token instead of hardcoding.",
    }
    later = {
        "id": "bbb22222",
        "path": "frontend/src/pages/dashboard/MobileDashboard.tsx",
        "line": 680,
        "body": "`#e5e7eb` is `chartColors.muted` (`--chart-muted`). Use the brand token instead of a raw hex.",
    }
    other = {
        "id": "ccc33333",
        "path": "frontend/src/pages/dashboard/MobileDashboard.tsx",
        "line": 509,
        "body": "`#059669` is `colors.score.birdie.fill` (`text-score-birdie`). Use the brand token instead of hardcoding.",
    }
    assert previous.same_issue(earlier, later)
    assert not previous.same_issue(earlier, other)


def test_rephrased_mvvm_finding_is_the_same_issue():
    earlier = {
        "path": "frontend/src/pages/dashboard/DashboardDesktopLayout.tsx",
        "body": 'The `"—"`-to-`null` mapping is branched in JSX. Have the view model expose the finished MiniKpi value so the view only passes it through.',
    }
    later = {
        "path": "frontend/src/pages/dashboard/DashboardDesktopLayout.tsx",
        "body": "The em-dash to null mapping is done in JSX. Have the view model expose the finished MiniKpi value so the view only passes it through.",
    }
    other = {
        "path": "frontend/src/pages/dashboard/DashboardDesktopLayout.tsx",
        "body": "Hole sorting is done inline in JSX. Have the view model hand over the holes already sorted so the view only maps over them.",
    }
    assert previous.same_issue(earlier, later)
    assert not previous.same_issue(earlier, other)


def test_new_findings_only_drops_issues_already_pointed_out():
    earlier = [
        {
            "id": "old1",
            "path": "frontend/src/pages/dashboard/MobileDashboard.tsx",
            "line": 110,
            "body": "`gap-[3px]` is `gap-chip` (3px in tokens.css). Use the kit spacing utility instead of an arbitrary value.",
            "comment_id": 1,
        }
    ]
    current = [
        {
            "path": "frontend/src/pages/dashboard/MobileDashboard.tsx",
            "line": 110,
            "body": "`gap-[3px]` is hardcoded — use `gap-chip` (`--brand-space-chip: 3px`) instead of an arbitrary value.",
        },
        {
            "path": "frontend/src/pages/dashboard/MobileDashboard.tsx",
            "line": 200,
            "body": "New logic in the view that the view model should own.",
        },
    ]
    fresh = previous.new_findings_only(earlier, current)
    assert len(fresh) == 1
    assert "view model" in fresh[0]["body"]


def test_resolve_statuses_marks_matched_open_and_missing_fixed():
    earlier = [
        {
            "id": "keep",
            "path": "a.tsx",
            "line": 1,
            "body": "`#e5e7eb` should be a token.",
            "comment_id": 10,
        },
        {
            "id": "gone",
            "path": "a.tsx",
            "line": 20,
            "body": "Hole sorting is done inline in JSX. Have the view model hand over the holes already sorted.",
            "comment_id": 11,
        },
    ]
    current = [
        {
            "path": "a.tsx",
            "line": 1,
            "body": "`#e5e7eb` is `chartColors.muted`. Use the token.",
        }
    ]
    statuses = previous.resolve_statuses(
        earlier, current, {}, used_object_format=False
    )
    assert statuses[0] == previous.STATUS_OPEN
    assert statuses[1] == previous.STATUS_FIXED


def test_build_replies_skips_same_sha_and_status():
    earlier = [
        {
            "id": "keep",
            "path": "a.tsx",
            "body": "`#e5e7eb` should be a token.",
            "comment_id": 10,
            "last_status": previous.STATUS_OPEN,
            "last_sha": "abc",
        },
        {
            "id": "gone",
            "path": "a.tsx",
            "body": "Hole sorting belongs in the view model.",
            "comment_id": 11,
            "last_status": previous.STATUS_OPEN,
            "last_sha": "old",
        },
    ]
    statuses = {0: previous.STATUS_OPEN, 1: previous.STATUS_FIXED}
    replies = previous.build_replies(earlier, statuses, "abc")
    assert len(replies) == 1
    assert replies[0]["in_reply_to"] == 11
    assert replies[0]["body"].startswith("✅")


def test_collect_previous_reads_metadata_and_last_status():
    original, fid = findings.decorate_body(
        body="`#e5e7eb` should be a token.",
        path="a.tsx",
        line=3,
        repo="o/r",
        pr_number="1",
        pr_url="https://example.test/1",
        bot_name="Brand Kit Bot",
    )
    comments = [
        {"id": 10, "path": "a.tsx", "line": 3, "body": original, "in_reply_to_id": None},
        {
            "id": 11,
            "in_reply_to_id": 10,
            "created_at": "2026-09-17T18:00:00Z",
            "body": previous.reply_body(previous.STATUS_OPEN, "oldsha", fid),
        },
    ]
    found = previous.collect_previous(comments, [], "Brand Kit Bot")
    assert len(found) == 1
    assert found[0]["id"] == fid
    assert found[0]["last_status"] == previous.STATUS_OPEN
    assert found[0]["last_sha"] == "oldsha"


def test_parse_model_output_object_and_array():
    obj = '{"previous": [{"id": "abc", "status": "fixed"}], "findings": [{"path": "a.tsx", "line": 1, "body": "x"}]}'
    findings_raw, status, used_obj = post_review.parse_model_output(obj)
    assert used_obj is True
    assert status["abc"] == previous.STATUS_FIXED
    assert findings_raw[0]["path"] == "a.tsx"

    arr = 'session\n[{"path": "b.tsx", "line": 2, "body": "y"}]\n'
    findings_raw, status, used_obj = post_review.parse_model_output(arr)
    assert used_obj is False
    assert status == {}
    assert findings_raw[0]["path"] == "b.tsx"


def test_post_review_does_not_reopen_previous_issue(tmp_path, bot_env, monkeypatch):
    original, fid = findings.decorate_body(
        body="`#e5e7eb` should be a token.",
        path="frontend/src/brand/components/Badge.tsx",
        line=2,
        repo="owner/birdie",
        pr_number="42",
        pr_url="https://github.com/owner/birdie/pull/42",
        bot_name="Brand Kit Bot",
    )
    previous_path = tmp_path / "previous.json"
    previous_path.write_text(
        json.dumps(
            [
                {
                    "id": fid,
                    "path": "frontend/src/brand/components/Badge.tsx",
                    "line": 2,
                    "body": "`#e5e7eb` should be a token.",
                    "comment_id": 99,
                    "bot": "Brand Kit Bot",
                }
            ]
        )
    )
    findings_path = tmp_path / "findings.json"
    findings_path.write_text(
        json.dumps(
            {
                "previous": [{"id": fid, "status": "open"}],
                "findings": [
                    {
                        "path": "frontend/src/brand/components/Badge.tsx",
                        "line": 2,
                        "body": "`#e5e7eb` is `chartColors.muted`. Use the brand token.",
                    },
                    {
                        "path": "frontend/src/brand/components/Badge.tsx",
                        "line": 1,
                        "body": "New kit component with no screenshot coverage.",
                    },
                ],
            }
        )
    )
    diff_path = tmp_path / "diff.patch"
    diff_path.write_text(DIFF)
    out_path = tmp_path / "review.json"
    fixable_path = tmp_path / "fixable.json"
    replies_path = tmp_path / "replies.json"

    monkeypatch.setattr(
        post_review.sys,
        "argv",
        [
            "post_review.py",
            str(findings_path),
            str(diff_path),
            "abc123def",
            str(out_path),
            str(fixable_path),
            str(previous_path),
            str(replies_path),
        ],
    )
    assert post_review.main() == 0

    review = json.loads(out_path.read_text())
    assert len(review["comments"]) == 1
    assert "screenshot" in review["comments"][0]["body"]
    assert "new finding" in review["body"]
    assert "still open" in review["body"]

    fixable = json.loads(fixable_path.read_text())
    assert len(fixable) == 1
    assert "screenshot" in fixable[0]["body"]

    replies = json.loads(replies_path.read_text())
    assert len(replies) == 1
    assert replies[0]["in_reply_to"] == 99
    assert replies[0]["body"].startswith("❌")


def test_already_open_pr_matches_rephrased_body():
    finding = {
        "path": "frontend/src/pages/dashboard/MobileDashboard.tsx",
        "body": "`#e5e7eb` is `chartColors.muted`. Use the brand token instead of hardcoding.",
    }
    prs = [
        {
            "number": 214,
            "url": "https://github.com/o/r/pull/214",
            "headRefName": "bot-fix/pr-183/deadbeef",
            "body": (
                "## What?\n\nImplements a Brand Kit Bot finding on #183: "
                "`#e5e7eb` is `chartColors.muted` (`--chart-muted`). Use the brand "
                "token instead of hardcoding.\n\n## Why?\n\nThe review bot flagged this."
            ),
        }
    ]
    match = previous.already_open_pr(finding, prs, "183")
    assert match is not None
    assert match["number"] == 214


def test_finding_text_strips_suggestion_block(bot_env):
    body, _fid = findings.decorate_body(
        body="`#2d7a3a` should be `text-primary`.",
        path="frontend/src/brand/components/Badge.tsx",
        line=2,
        repo="owner/birdie",
        pr_number="42",
        pr_url="https://github.com/owner/birdie/pull/42",
        bot_name="Brand Kit Bot",
        suggestion='  return <span className="text-primary">x</span>',
    )
    assert "```suggestion" in body
    assert "Commit the suggestion" in body
    assert findings.finding_text(body) == "`#2d7a3a` should be `text-primary`."


def test_normalize_suggestion_unwraps_fences():
    assert findings.normalize_suggestion("  foo") == "  foo"
    assert findings.normalize_suggestion(["  foo", "  bar"]) == "  foo\n  bar"
    assert (
        findings.normalize_suggestion("```suggestion\n  foo\n```") == "  foo"
    )
    assert findings.normalize_suggestion("   \n") is None


def test_post_review_embeds_commit_suggestion(tmp_path, bot_env, monkeypatch):
    findings_path = tmp_path / "findings.json"
    findings_path.write_text(
        json.dumps(
            [
                {
                    "path": "frontend/src/brand/components/Badge.tsx",
                    "line": 2,
                    "body": "`#2d7a3a` should be `text-primary`.",
                    "suggestion": '  return <span className="text-primary">x</span>',
                },
                {
                    "path": "frontend/src/brand/components/Badge.tsx",
                    "line": 1,
                    "body": "New kit component with no screenshot coverage.",
                },
            ]
        )
    )
    diff_path = tmp_path / "diff.patch"
    diff_path.write_text(DIFF)
    out_path = tmp_path / "review.json"
    fixable_path = tmp_path / "fixable.json"

    monkeypatch.setattr(
        post_review.sys,
        "argv",
        [
            "post_review.py",
            str(findings_path),
            str(diff_path),
            "abc123def",
            str(out_path),
            str(fixable_path),
        ],
    )
    assert post_review.main() == 0

    review = json.loads(out_path.read_text())
    suggested = next(c for c in review["comments"] if "```suggestion" in c["body"])
    assert suggested["line"] == 2
    assert suggested["side"] == "RIGHT"
    assert "text-primary" in suggested["body"]
    assert "start_line" not in suggested

    fixable = json.loads(fixable_path.read_text())
    assert len(fixable) == 1
    assert "screenshot" in fixable[0]["body"]
    assert "commit suggestion" in review["body"]
    assert "1 will open as a fix PR" in review["body"]


def test_identical_suggestion_is_dropped():
    source = post_review.added_source(DIFF)
    valid = post_review.added_lines(DIFF)
    staged = post_review.collect_findings(
        [
            {
                "path": "frontend/src/brand/components/Badge.tsx",
                "line": 2,
                "body": "leave this line alone",
                "suggestion": '  return <span className="text-[#2d7a3a]">x</span>',
            }
        ],
        valid,
        source,
    )
    assert staged[0]["suggestion"] is None


def test_multiline_suggestion_sets_start_line():
    source = post_review.added_source(DIFF)
    valid = post_review.added_lines(DIFF)
    staged = post_review.collect_findings(
        [
            {
                "path": "frontend/src/brand/components/Badge.tsx",
                "line": 3,
                "start_line": 1,
                "body": "Rewrite the component to use the kit.",
                "suggestion": "export function Badge() {\n  return <span className=\"text-primary\">x</span>\n}",
            }
        ],
        valid,
        source,
    )
    assert staged[0]["start_line"] == 1
    assert staged[0]["line"] == 3
    assert staged[0]["suggestion"] is not None
