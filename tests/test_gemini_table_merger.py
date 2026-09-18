from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import services.gemini_table_merger as gemini_merger


CANONICAL_HEADER = (
    "| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | OUT | "
    "10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | IN | TOT |"
)
CANONICAL_SEPARATOR = "| " + " | ".join([":---"] * 22) + " |"
COMPLETE_ROW = (
    "| Tucker | 1 | 1 | 0 | 0 | 0 | 1 | 2 | 0 | 1 | 43 | "
    "1 | 1 | 1 | 2 | 2 | 1 | 2 | 1 | 1 | 47 | 90 |"
)
VALID_MERGE = "\n".join((CANONICAL_HEADER, CANONICAL_SEPARATOR, COMPLETE_ROW))


def configure_gemini(monkeypatch, text):
    from google import genai

    response = SimpleNamespace(text=text)
    model = SimpleNamespace(generate_content=AsyncMock(return_value=response))
    client = SimpleNamespace(aio=SimpleNamespace(models=model))
    monkeypatch.setattr(genai, "Client", lambda api_key: client)
    monkeypatch.setenv("GOOGLE_API_KEY", "key")
    return response, model


@pytest.mark.asyncio
async def test_merge_without_api_key_returns_original(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    assert await gemini_merger.merge_split_tables("original") == "original"


@pytest.mark.asyncio
async def test_merge_strips_markdown_fence(monkeypatch):
    configure_gemini(monkeypatch, f"```markdown\n{VALID_MERGE}\n```")

    assert await gemini_merger.merge_split_tables("original") == VALID_MERGE


@pytest.mark.asyncio
async def test_empty_merge_returns_original(monkeypatch):
    configure_gemini(monkeypatch, "")

    assert await gemini_merger.merge_split_tables("original") == "original"


@pytest.mark.asyncio
async def test_merge_failure_returns_original(monkeypatch):
    _, model = configure_gemini(monkeypatch, "unused")
    model.generate_content.side_effect = RuntimeError("down")

    assert await gemini_merger.merge_split_tables("original") == "original"


@pytest.mark.asyncio
async def test_merge_removes_proven_blank_initials_separator(monkeypatch):
    source = (
        "| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | OUT | INITIALS | "
        "10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | IN | TOT |\n"
        "| Tucker | 1 | 1 | 0 | 0 | 0 | 1 | 2 | 0 | 1 | 43 | | "
        "1 | 1 | 1 | 2 | 2 | 1 | 2 | 1 | 1 | 47 | 90 |"
    )
    malformed = (
        f"{CANONICAL_HEADER}\n{CANONICAL_SEPARATOR}\n"
        "| Tucker | 1 | 1 | 0 | 0 | 0 | 1 | 2 | 0 | 1 | 43 | | "
        "1 | 1 | 1 | 2 | 2 | 1 | 2 | 1 | 1 | 47 | 90 |"
    )
    configure_gemini(monkeypatch, malformed)

    assert await gemini_merger.merge_split_tables(source) == VALID_MERGE


@pytest.mark.asyncio
async def test_merge_rejects_incomplete_player_half(monkeypatch):
    incomplete = (
        f"{CANONICAL_HEADER}\n{CANONICAL_SEPARATOR}\n"
        "| Tucker | 4 | 4 | 4 | 5 | 6 | 4 | 7 | 3 | 4 | 41 | "
        "| | | | | | | | | | | |"
    )
    configure_gemini(monkeypatch, incomplete)

    assert await gemini_merger.merge_split_tables("raw mistral") == "raw mistral"


@pytest.mark.asyncio
async def test_merge_rejects_missing_columns(monkeypatch):
    configure_gemini(monkeypatch, f"{CANONICAL_HEADER}\n| Tucker | 1 | 2 |")

    assert await gemini_merger.merge_split_tables("raw mistral") == "raw mistral"


@pytest.mark.asyncio
async def test_merge_discards_fully_empty_spacer_rows(monkeypatch):
    empty = "| " + " | ".join([""] * 22) + " |"
    configure_gemini(monkeypatch, f"{CANONICAL_HEADER}\n{empty}\n{COMPLETE_ROW}")

    result = await gemini_merger.merge_split_tables("raw mistral")

    assert result == f"{CANONICAL_HEADER}\n{COMPLETE_ROW}"
