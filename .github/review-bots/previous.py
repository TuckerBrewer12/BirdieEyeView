#!/usr/bin/env python3
"""Dedup earlier bot findings and build recheck replies.

On synchronize the model often rephrases the same issue, which used to mint a
new finding id and a second fix PR. This module matches those to comments this
bot already left, replies ✅/❌ on the original thread, and keeps only new
issues for comments and fix PRs.

CLI:
    previous.py collect        # COMMENTS_JSON REVIEWS_JSON -> previous findings
    previous.py already-open   # FINDING_JSON + OPEN_PRS -> matching PR or {}
"""
from __future__ import annotations

import json
import os
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

_BOTS = Path(__file__).resolve().parent
if str(_BOTS) not in sys.path:
    sys.path.insert(0, str(_BOTS))

import findings

STATUS_FIXED = "fixed"
STATUS_OPEN = "open"
MATCH_THRESHOLD = 0.5

STATUS_RE = re.compile(r"<!-- review-bot-status:(\{.*?\}) -->", re.DOTALL)
BACKTICK_RE = re.compile(r"`([^`]+)`")
HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")
TW_RE = re.compile(
    r"\b(?:text|bg|border|gap|rounded|font|from|to|ring|shadow|w|h|p|px|py|pt|pb|"
    r"m|mx|my|mt|mb|min-w|min-h|max-w|max-h)-[a-zA-Z0-9./[\]%-]+"
)
CSS_RE = re.compile(
    r"\b(?:fontSize|borderRadius|width|height|top|bottom|left|right|gap|"
    r"padding|margin|color)\s*:\s*-?[\d.]+"
)
CAMEL_RE = re.compile(r"\b[A-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b")
BODY_ONLY_THRESHOLD = 0.72
FINDING_IN_PR_RE = re.compile(
    r"finding on #\d+:\s*(.*?)(?:\n\n## |\Z)", re.DOTALL
)

FIXED_REPLY = "✅ This looks fixed on the latest commit."
OPEN_REPLY = "❌ This hasn't been addressed yet."


def load_json_list(path: Path | str) -> list[Any]:
    """Read a JSON array, or several arrays concatenated by `gh api --paginate`."""
    text = Path(path).read_text().strip() if path else ""
    if not text:
        return []
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        return [data]
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    items: list[Any] = []
    idx = 0
    while idx < len(text):
        while idx < len(text) and text[idx].isspace():
            idx += 1
        if idx >= len(text):
            break
        obj, end = decoder.raw_decode(text, idx)
        if isinstance(obj, list):
            items.extend(obj)
        else:
            items.append(obj)
        idx = end
    return items


def _split_token(tok: str) -> set[str]:
    parts = re.split(r"[\s/,|]+", tok.lower())
    return {p.strip("`'\"") for p in parts if len(p.strip("`'\"") ) >= 2}


def distinctive(body: str) -> set[str]:
    """Tokens that identify *which* issue this is, not generic review language."""
    text = body or ""
    items: set[str] = set()
    for raw in BACKTICK_RE.findall(text):
        items.update(_split_token(raw))
    items.update(m.lower() for m in HEX_RE.findall(text))
    items.update(m.lower() for m in TW_RE.findall(text))
    items.update(re.sub(r"\s+", "", m).lower() for m in CSS_RE.findall(text))
    items.update(m.lower() for m in CAMEL_RE.findall(text))
    return {t for t in items if t}


def _norm(body: str) -> str:
    return re.sub(r"\s+", " ", (body or "").lower()).strip()


def similarity(a: dict[str, Any], b: dict[str, Any], *, require_path: bool = True) -> float:
    """0–1 score. Same path + overlapping distinctive tokens, or close prose."""
    path_a, path_b = str(a.get("path") or ""), str(b.get("path") or "")
    if require_path and path_a and path_b and path_a != path_b:
        return 0.0

    id_a, id_b = str(a.get("id") or ""), str(b.get("id") or "")
    if id_a and id_b and id_a == id_b:
        return 1.0

    body_a = str(a.get("body") or "")
    body_b = str(b.get("body") or "")
    body_ratio = SequenceMatcher(None, _norm(body_a), _norm(body_b)).ratio()

    da, db = distinctive(body_a), distinctive(body_b)
    if da and db:
        inter, union = da & db, da | db
        if not inter and body_ratio < 0.8:
            return 0.0
        jaccard = len(inter) / len(union) if union else 0.0
        score = 0.55 * jaccard + 0.45 * body_ratio
    else:
        if body_ratio < BODY_ONLY_THRESHOLD:
            return 0.0
        score = body_ratio

    line_a, line_b = a.get("line"), b.get("line")
    if isinstance(line_a, int) and isinstance(line_b, int):
        dist = abs(line_a - line_b)
        score += 0.05 * max(0.0, 1.0 - dist / 80.0)

    return score


def same_issue(a: dict[str, Any], b: dict[str, Any], *, require_path: bool = True) -> bool:
    return similarity(a, b, require_path=require_path) >= MATCH_THRESHOLD


def match_findings(
    previous: list[dict[str, Any]],
    current: list[dict[str, Any]],
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    """Greedy unique pairs of earlier comments and current findings."""
    pairs: list[tuple[float, int, int]] = []
    for i, prev in enumerate(previous):
        for j, cur in enumerate(current):
            score = similarity(prev, cur)
            if score >= MATCH_THRESHOLD:
                pairs.append((score, i, j))
    pairs.sort(key=lambda item: item[0], reverse=True)

    used_prev: set[int] = set()
    used_cur: set[int] = set()
    matched: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for _score, i, j in pairs:
        if i in used_prev or j in used_cur:
            continue
        used_prev.add(i)
        used_cur.add(j)
        matched.append((previous[i], current[j]))
    return matched


def parse_status_blob(body: str) -> dict[str, Any] | None:
    match = STATUS_RE.search(body or "")
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def status_blob(*, finding_id: str, status: str, sha: str) -> str:
    payload = {"id": finding_id, "status": status, "sha": sha}
    return f"<!-- review-bot-status:{json.dumps(payload, separators=(',', ':'))} -->"


def reply_body(status: str, sha: str, finding_id: str) -> str:
    text = FIXED_REPLY if status == STATUS_FIXED else OPEN_REPLY
    return f"{text}\n\n{status_blob(finding_id=finding_id, status=status, sha=sha)}"


def normalize_model_status(item: object) -> tuple[str, str] | None:
    """Return (id, fixed|open) from one model `previous` element."""
    if not isinstance(item, dict):
        return None
    fid = str(item.get("id") or "").strip()
    if not fid:
        return None
    raw = str(item.get("status") or "").strip().lower()
    if raw in {"fixed", "resolved", "done", "closed"}:
        return fid, STATUS_FIXED
    if raw in {"open", "unresolved", "present", "still_open", "not_fixed"}:
        return fid, STATUS_OPEN
    if "fixed" in item:
        return fid, STATUS_FIXED if item["fixed"] else STATUS_OPEN
    return None


def _last_status_reply(
    comment_id: int,
    comments: list[dict[str, Any]],
) -> dict[str, Any] | None:
    replies = [
        c
        for c in comments
        if isinstance(c, dict) and c.get("in_reply_to_id") == comment_id
    ]
    latest: dict[str, Any] | None = None
    latest_key = ""
    for reply in replies:
        blob = parse_status_blob(str(reply.get("body") or ""))
        if not blob:
            continue
        key = str(reply.get("created_at") or "")
        if key >= latest_key:
            latest_key = key
            latest = blob
    return latest


def collect_previous(
    comments: list[dict[str, Any]],
    reviews: list[dict[str, Any]],
    bot_name: str,
) -> list[dict[str, Any]]:
    """Original findings this bot already posted, with last recheck if any."""
    previous: list[dict[str, Any]] = []
    seen_comment_ids: set[int] = set()

    for comment in comments:
        if not isinstance(comment, dict):
            continue
        if comment.get("in_reply_to_id"):
            continue
        body = str(comment.get("body") or "")
        meta = findings.parse_metadata(body)
        if not meta:
            continue
        if str(meta.get("bot") or "") != bot_name:
            continue
        cid = comment.get("id")
        last = _last_status_reply(cid, comments) if isinstance(cid, int) else None
        item = {
            "id": str(meta.get("id") or ""),
            "path": str(meta.get("path") or comment.get("path") or ""),
            "line": meta.get("line") if isinstance(meta.get("line"), int) else comment.get("line"),
            "body": findings.finding_text(body),
            "bot": bot_name,
            "comment_id": cid if isinstance(cid, int) else None,
            "last_status": (last or {}).get("status"),
            "last_sha": (last or {}).get("sha"),
        }
        previous.append(item)
        if isinstance(cid, int):
            seen_comment_ids.add(cid)

    for review in reviews:
        if not isinstance(review, dict):
            continue
        body = str(review.get("body") or "")
        if f"### {bot_name}" not in body and bot_name not in body:
            continue
        for match in findings.META_RE.finditer(body):
            try:
                meta = json.loads(match.group(1))
            except json.JSONDecodeError:
                continue
            if not isinstance(meta, dict):
                continue
            if str(meta.get("bot") or "") != bot_name:
                continue
            fid = str(meta.get("id") or "")
            if not fid or any(p["id"] == fid for p in previous):
                continue
            snippet_start = max(0, match.start() - 400)
            snippet = body[snippet_start : match.start()]
            previous.append(
                {
                    "id": fid,
                    "path": str(meta.get("path") or ""),
                    "line": meta.get("line") if isinstance(meta.get("line"), int) else None,
                    "body": findings.finding_text(snippet),
                    "bot": bot_name,
                    "comment_id": None,
                    "last_status": None,
                    "last_sha": None,
                }
            )

    return previous


def resolve_statuses(
    previous: list[dict[str, Any]],
    current: list[dict[str, Any]],
    model_status: dict[str, str],
    *,
    used_object_format: bool,
) -> dict[int, str]:
    """Map previous index → fixed|open."""
    pairs = match_findings(previous, current)
    open_idx = {id(prev) for prev, _cur in pairs}

    changed = True
    while changed:
        changed = False
        for prev in previous:
            if id(prev) in open_idx:
                continue
            for other in previous:
                if id(other) in open_idx and same_issue(prev, other):
                    open_idx.add(id(prev))
                    changed = True
                    break

    resolved: dict[int, str] = {}
    for i, prev in enumerate(previous):
        fid = str(prev.get("id") or "")
        if id(prev) in open_idx:
            resolved[i] = STATUS_OPEN
        elif model_status.get(fid) == STATUS_FIXED:
            resolved[i] = STATUS_FIXED
        elif model_status.get(fid) == STATUS_OPEN or used_object_format:
            resolved[i] = STATUS_OPEN
        else:
            # Bare array: the model was told not to repeat itself, so a miss
            # after matching means the issue did not come back.
            resolved[i] = STATUS_FIXED
    return resolved


def new_findings_only(
    previous: list[dict[str, Any]],
    current: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    matched_cur = {id(cur) for _prev, cur in match_findings(previous, current)}
    return [item for item in current if id(item) not in matched_cur]


def build_replies(
    previous: list[dict[str, Any]],
    statuses: dict[int, str],
    sha: str,
) -> list[dict[str, Any]]:
    replies: list[dict[str, Any]] = []
    for i, prev in enumerate(previous):
        cid = prev.get("comment_id")
        if not isinstance(cid, int):
            continue
        status = statuses.get(i) or STATUS_OPEN
        if prev.get("last_sha") == sha and prev.get("last_status") == status:
            continue
        replies.append(
            {
                "in_reply_to": cid,
                "body": reply_body(status, sha, str(prev.get("id") or "")),
            }
        )
    return replies


def recheck_summary_lines(
    previous: list[dict[str, Any]],
    statuses: dict[int, str],
) -> tuple[int, int, list[str]]:
    """Return (fixed, open, orphan bullet lines)."""
    fixed = sum(1 for i in range(len(previous)) if statuses.get(i) == STATUS_FIXED)
    still_open = len(previous) - fixed
    orphan_lines: list[str] = []
    for i, prev in enumerate(previous):
        if prev.get("comment_id") is not None:
            continue
        status = statuses.get(i) or STATUS_OPEN
        mark = "✅" if status == STATUS_FIXED else "❌"
        where = f"{prev.get('path')}:{prev.get('line')}" if prev.get("line") else prev.get("path")
        note = "this looks fixed" if status == STATUS_FIXED else "this hasn't been addressed yet"
        orphan_lines.append(f"- {mark} **`{where}`** — {note}.")
    return fixed, still_open, orphan_lines


def already_open_pr(
    finding: dict[str, Any],
    prs: list[dict[str, Any]],
    pr_number: str,
) -> dict[str, Any] | None:
    """An open bot-fix PR for this parent that is the same finding, even if the id drifted."""
    prefix = f"bot-fix/pr-{pr_number}/"
    best: dict[str, Any] | None = None
    best_score = 0.0
    for pr in prs:
        if not isinstance(pr, dict):
            continue
        head = str(pr.get("headRefName") or "")
        if not head.startswith(prefix):
            continue
        body = str(pr.get("body") or "")
        match = FINDING_IN_PR_RE.search(body)
        other_body = match.group(1).strip() if match else body
        other = {
            "path": finding.get("path") or "",
            "body": other_body,
            "id": "",
        }
        score = similarity(finding, other, require_path=False)
        if score > best_score:
            best_score = score
            best = pr
    if best is not None and best_score >= MATCH_THRESHOLD:
        return {"number": best.get("number"), "url": best.get("url")}
    return None


def prompt_appendix(previous: list[dict[str, Any]]) -> str:
    if not previous:
        return ""
    listed = [
        {
            "id": item.get("id"),
            "path": item.get("path"),
            "line": item.get("line"),
            "body": item.get("body"),
        }
        for item in previous
    ]
    payload = json.dumps(listed, indent=2)
    return (
        "\n---\n\n"
        "## Previous findings from this bot\n\n"
        "You already pointed these out on this PR. Do not put them in "
        "`findings` again.\n\n"
        "For each, set `status` to `\"fixed\"` if the latest commit addressed "
        "it, or `\"open\"` if it is still present.\n\n"
        f"```json\n{payload}\n```\n\n"
        "## Output\n\n"
        "Reply with one JSON object and nothing else:\n\n"
        "{\n"
        '  "previous": [{"id": "<id from the list>", "status": "fixed"|"open"}],\n'
        '  "findings": [{"path": "...", "line": 1, "body": "...", "suggestion": "optional replacement"}]\n'
        "}\n\n"
        "`findings` is only NEW issues, not already in the previous list. "
        "If there are none, use `[]`.\n"
    )


def cmd_collect() -> int:
    comments_path = os.environ.get("COMMENTS_JSON", "")
    reviews_path = os.environ.get("REVIEWS_JSON", "")
    bot_name = os.environ.get("BOT_NAME", "Review Bot")
    comments = load_json_list(comments_path) if comments_path else []
    reviews = load_json_list(reviews_path) if reviews_path else []
    previous = collect_previous(comments, reviews, bot_name)
    json.dump(previous, sys.stdout)
    print()
    return 0


def cmd_already_open() -> int:
    finding = json.loads(os.environ.get("FINDING_JSON") or "{}")
    prs = json.loads(os.environ.get("OPEN_PRS") or "[]")
    pr_number = os.environ.get("PR_NUMBER", "")
    match = already_open_pr(finding, prs, pr_number)
    json.dump(match or {}, sys.stdout)
    print()
    return 0


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__, file=sys.stderr)
        return 2
    command = args[0]
    if command == "collect":
        return cmd_collect()
    if command == "already-open":
        return cmd_already_open()
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
