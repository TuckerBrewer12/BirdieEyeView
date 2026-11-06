"""AGENTS.md is CLAUDE.md for Codex: the same guidance under another title, so the two never drift."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The title and the line naming the agent are the only lines that differ.
HEADER_LINES = 3


def test_agents_md_matches_claude_md_below_its_header():
    claude = (ROOT / "CLAUDE.md").read_text().splitlines()
    agents = (ROOT / "AGENTS.md").read_text().splitlines()
    assert agents[0] == "# AGENTS.md"
    assert agents[HEADER_LINES:] == claude[HEADER_LINES:], (
        "AGENTS.md has drifted from CLAUDE.md. Copy CLAUDE.md over it, keeping AGENTS.md's first three lines."
    )
