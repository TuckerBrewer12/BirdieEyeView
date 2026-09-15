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
import recipes


DIFF = """\
diff --git a/frontend/src/brand/components/Badge.tsx b/frontend/src/brand/components/Badge.tsx
--- /dev/null
+++ b/frontend/src/brand/components/Badge.tsx
@@ -0,0 +1,4 @@
+export function Badge() {
+  return <span style={{ color: "#2d7a3a" }}>x</span>
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
    # Re-read module-level names that captured env at import.
    monkeypatch.setattr(post_review, "BOT_NAME", "Brand Kit Bot")


def test_catalog_lists_known_recipes_and_hides_generic():
    catalog = recipes.catalog()
    assert "`screenshot-coverage`" in catalog
    assert "`brand-token`" in catalog
    assert "`kit-component`" in catalog
    assert "`view-model-extraction`" in catalog
    assert "`generic`" not in catalog
    assert "generic" not in recipes.known_ids()


def test_load_falls_back_to_generic():
    loaded = recipes.load("not-a-recipe")
    assert loaded.id == "generic"
    assert recipes.load("screenshot-coverage").setup == "frontend-playwright"
    assert recipes.runner_for("frontend-playwright") == "macos-latest"
    assert recipes.runner_for("frontend") == "ubuntu-latest"


def test_info_resolves_defaults():
    info = recipes.info(recipes.load("generic"))
    assert info["setup"] == "none"
    assert info["runner"] == "ubuntu-latest"
    assert info["title"]


def test_finding_id_ignores_line_number():
    a = findings.finding_id("a.tsx", "brand-token", "use a token")
    b = findings.finding_id("a.tsx", "brand-token", "use a token")
    c = findings.finding_id("a.tsx", "brand-token", "different")
    assert a == b
    assert a != c


def test_unknown_recipe_is_dropped():
    assert findings.recipe_id_of("screenshot-coverage") == "screenshot-coverage"
    assert findings.recipe_id_of("generic") == ""
    assert findings.recipe_id_of("nope") == ""
    assert findings.recipe_id_of(None) == ""


def test_comment_round_trip_metadata(bot_env):
    body, fid = findings.decorate_body(
        body="Add a preview for Badge.",
        path="frontend/src/brand/components/Badge.tsx",
        line=1,
        recipe="screenshot-coverage",
        auto_fix=True,
        repo="owner/birdie",
        pr_number="42",
        pr_url="https://github.com/owner/birdie/pull/42",
        bot_name="Brand Kit Bot",
        head_sha="abc123def",
    )
    assert "Discuss in Conductor" in body
    assert "conductor://prompt=" in body
    assert "agent=cursor" in body
    assert "model=grok-4.6" in body
    assert "Opening a PR with this change" in body
    meta = findings.parse_metadata(body)
    assert meta is not None
    assert meta["id"] == fid
    assert meta["recipe"] == "screenshot-coverage"
    assert meta["path"].endswith("Badge.tsx")
    assert meta["line"] == 1
    stripped = findings._body_without_markup(body)
    assert stripped == "Add a preview for Badge."
    assert "Discuss" not in stripped


def test_is_fix_command_does_not_match_bot_footer():
    footer = "Opening a PR with this change. Reply `/fix` to retry."
    assert findings.is_fix_command("/fix") is True
    assert findings.is_fix_command("/fix please") is True
    assert findings.is_fix_command(footer) is False
    assert findings.is_fix_command("please /fix this") is False


def test_assign_auto_fix_all_recipe_findings():
    items = [
        {"recipe": "brand-token", "path": f"f{i}.tsx", "body": f"x{i}"}
        for i in range(8)
    ]
    items.append({"recipe": "", "path": "other.tsx", "body": "no recipe"})
    findings.assign_auto_fix(items)
    assert all(i["auto_fix"] for i in items if i["recipe"])
    assert items[-1]["auto_fix"] is False


def test_extract_array_survives_chrome():
    raw = 'session start\n```json\n[{"path": "a.tsx", "line": 1, "body": "x"}]\n```\ndone'
    assert json.loads(post_review.extract_array(raw)) == [
        {"path": "a.tsx", "line": 1, "body": "x"}
    ]


def test_added_lines_from_new_file():
    lines = post_review.added_lines(DIFF)
    assert "frontend/src/brand/components/Badge.tsx" in lines
    assert lines["frontend/src/brand/components/Badge.tsx"] == {1, 2, 3, 4}


def test_post_review_writes_fixable_payload(tmp_path, bot_env, monkeypatch):
    findings_path = tmp_path / "findings.json"
    findings_path.write_text(
        json.dumps(
            [
                {
                    "path": "frontend/src/brand/components/Badge.tsx",
                    "line": 1,
                    "body": "New kit component with no screenshot coverage.",
                    "recipe": "screenshot-coverage",
                },
                {
                    "path": "frontend/src/brand/components/Badge.tsx",
                    "line": 2,
                    "body": "A design question with no recipe.",
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
    assert "screenshot-coverage" in review["comments"][0]["body"]
    assert "Reply `/fix`" in review["comments"][1]["body"]

    fixable = json.loads(fixable_path.read_text())
    assert len(fixable) == 1
    assert fixable[0]["recipe"] == "screenshot-coverage"
    assert fixable[0]["runner"] == "macos-latest"
    assert fixable[0]["setup"] == "frontend-playwright"
    assert fixable[0]["branch"].startswith("bot-fix/pr-42/screenshot-coverage-")
    assert "fix PR" in review["body"]


def test_from_comment_builds_payload(monkeypatch, bot_env):
    original, fid = findings.decorate_body(
        body="Swap this button for the kit Button.",
        path="frontend/src/pages/RoundsPage/RoundsPage.tsx",
        line=10,
        recipe="kit-component",
        auto_fix=True,
        repo="owner/birdie",
        pr_number="42",
        pr_url="https://github.com/owner/birdie/pull/42",
        bot_name="Brand Kit Bot",
        head_sha="abc123def",
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
    assert payload[0]["recipe"] == "kit-component"
    assert payload[0]["body"] == "Swap this button for the kit Button."
    assert payload[0]["runner"] == "ubuntu-latest"


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


def test_build_prompt_includes_recipe():
    payload = findings.fix_payload(
        fid="deadbeef",
        recipe="screenshot-coverage",
        path="frontend/src/brand/components/Badge.tsx",
        line=1,
        body="Add a preview.",
        bot_name="Brand Kit Bot",
        auto_fix=True,
        pr_number="42",
    )
    prompt = findings.build_prompt(payload)
    assert "Add a preview." in prompt
    assert "previews/<Name>.tsx" in prompt
    assert payload["title"]
