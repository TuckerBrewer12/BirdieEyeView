from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import services.gemini_table_merger as gemini_merger


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
    configure_gemini(monkeypatch, "```markdown\n| merged |\n```")

    assert await gemini_merger.merge_split_tables("original") == "| merged |"


@pytest.mark.asyncio
async def test_empty_merge_returns_original(monkeypatch):
    configure_gemini(monkeypatch, "")

    assert await gemini_merger.merge_split_tables("original") == "original"


@pytest.mark.asyncio
async def test_merge_failure_returns_original(monkeypatch):
    _, model = configure_gemini(monkeypatch, "unused")
    model.generate_content.side_effect = RuntimeError("down")

    assert await gemini_merger.merge_split_tables("original") == "original"
