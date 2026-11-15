#!/usr/bin/env python3
from __future__ import annotations

from urllib.parse import quote

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
) -> str:
    where = f"{path}:{line}" if line else path
    lines = [
        f"I'm reviewing a bot finding on PR #{pr_number} of {repo}.",
        "",
        f"File: {where}",
        f"Reviewer: {bot_name}",
        f"Finding: {body}",
        f"PR: {pr_url}",
        "",
        "Is this worth doing, and what should the change actually look like?",
    ]
    prompt = "\n".join(lines)
    if len(prompt) > MAX_PROMPT:
        prompt = prompt[: MAX_PROMPT - 1] + "…"
    return prompt


def conductor_url(prompt: str) -> str:
    q = quote(prompt, safe="")
    return f"conductor://prompt={q}&agent={CONDUCTOR_AGENT}&model={CONDUCTOR_MODEL}"


def comment_actions(discuss_url: str, *, has_suggestion: bool = False) -> str:
    if has_suggestion:
        extra = (
            "Commit the suggestion on this comment to apply it here. "
            "Reply `/fix` if you'd rather have a fix PR."
        )
    else:
        extra = (
            "A follow-up job will open a PR with this change and reply with the "
            "link. Merge it into this branch if it looks right. Reply `/fix` to retry."
        )
    return f"[{DISCUSS_LABEL}]({discuss_url})\n\n{extra}"
