#!/usr/bin/env python3
"""Deep links that hand a review finding to a Conductor chat with context attached.

The point is that "discuss this further" should cost one click, not a round of
copy-pasting the file, the line, and what the bot said. Opens in Conductor with
Grok (Cursor agent, model grok-4.6).
"""
from __future__ import annotations

from urllib.parse import quote

# Chat URLs are query strings; browsers and proxies start truncating well before
# the theoretical limit, so the seeded prompt stays short and links out for the rest.
MAX_PROMPT = 1600

CONDUCTOR_AGENT = "cursor"
CONDUCTOR_MODEL = "grok-4.6"
DISCUSS_LABEL = "Discuss in Conductor"


def discussion_prompt(
    *,
    repo: str,
    pr_number: str,
    pr_url: str,
    bot_name: str,
    path: str,
    line: object,
    body: str,
    recipe_url: str = "",
) -> str:
    where = f"{path}:{line}" if line else path
    lines = [
        f"I'm reviewing a bot finding on PR #{pr_number} of {repo}.",
        "",
        f"File: {where}",
        f"Reviewer: {bot_name}",
        f"Finding: {body}",
    ]
    if recipe_url:
        lines.append(f"The repo's standard for this: {recipe_url}")
    lines += [
        f"PR: {pr_url}",
        "",
        "Is this worth doing, and what should the change actually look like?",
    ]
    prompt = "\n".join(lines)
    if len(prompt) > MAX_PROMPT:
        prompt = prompt[: MAX_PROMPT - 1] + "…"
    return prompt


def conductor_url(prompt: str) -> str:
    """Open a new Conductor workspace with Grok selected and the prompt filled in."""
    q = quote(prompt, safe="")
    return f"conductor://prompt={q}&agent={CONDUCTOR_AGENT}&model={CONDUCTOR_MODEL}"


def recipe_blob_url(repo: str, sha: str, recipe_id: str) -> str:
    if not repo or not recipe_id:
        return ""
    ref = sha or "main"
    return f"https://github.com/{repo}/blob/{ref}/.github/review-bots/recipes/{recipe_id}.md"


def comment_actions(discuss_url: str, *, auto_fix: bool, has_recipe: bool) -> str:
    """The human-facing footer: discuss, or wait for / retry a fix PR."""
    lines = [f"[{DISCUSS_LABEL}]({discuss_url})"]
    if auto_fix:
        lines.append(
            "Opening a PR with this change — merge it into this branch if it looks "
            "right. Reply `/fix` to retry."
        )
    elif has_recipe:
        lines.append("Reply `/fix` to open a PR that implements this.")
    else:
        lines.append("Reply `/fix` to attempt a fix PR.")
    return "\n\n".join(lines)
