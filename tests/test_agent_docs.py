from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_claude_md_is_agents_md():
    claude = ROOT / "CLAUDE.md"
    assert claude.is_symlink() and claude.readlink() == Path("AGENTS.md"), (
        "CLAUDE.md must stay a symlink to AGENTS.md so every agent reads one file. Edit AGENTS.md."
    )
