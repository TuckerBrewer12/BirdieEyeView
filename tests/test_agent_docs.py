from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

HEADER_LINES = 3


def test_agents_md_matches_claude_md_below_its_header():
    claude = (ROOT / "CLAUDE.md").read_text().splitlines()
    agents = (ROOT / "AGENTS.md").read_text().splitlines()
    assert agents[0] == "# AGENTS.md"
    assert agents[HEADER_LINES:] == claude[HEADER_LINES:], (
        "AGENTS.md has drifted from CLAUDE.md. Copy CLAUDE.md over it, keeping AGENTS.md's first three lines."
    )
