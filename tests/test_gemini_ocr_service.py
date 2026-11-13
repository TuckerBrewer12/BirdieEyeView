from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from services.gemini_ocr_service import GeminiOCRService, to_mistral_shape
from services.mistral_ocr_service import MistralOCRService


def test_gemini_reply_converts_like_mistral_output():
    reply = (
        '{"text": "Half Moon Bay", "tables": ['
        '"<table><tr><td>HOLE</td><td>1</td><td>2</td></tr><tr><td>PAR</td><td>4</td><td></td></tr></table>"]}'
    )

    markdown = MistralOCRService.extract_markdown_text(to_mistral_shape(reply))

    assert markdown == "| HOLE | 1 | 2 |\n| PAR | 4 |  |\n\nHalf Moon Bay"


def test_gemini_reply_drops_non_string_tables():
    shape = to_mistral_shape('{"tables": ["<table><tr><td>1</td></tr></table>", 5, " "], "text": null}')

    assert shape == {"pages": [{"markdown": "", "tables": [{"content": "<table><tr><td>1</td></tr></table>"}]}]}


@pytest.mark.parametrize("reply", ["not json", "[]"])
def test_gemini_reply_that_is_not_a_json_object_fails(reply):
    with pytest.raises(RuntimeError):
        to_mistral_shape(reply)


@pytest.mark.asyncio
async def test_missing_key_is_an_environment_error(monkeypatch, tmp_path):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    with pytest.raises(EnvironmentError):
        await GeminiOCRService().ocr_file(tmp_path / "card.jpg")


@pytest.mark.asyncio
async def test_missing_file_is_a_file_not_found_error(tmp_path):
    with pytest.raises(FileNotFoundError):
        await GeminiOCRService(api_key="key").ocr_file(tmp_path / "missing.jpg")


def _install_fake_client(monkeypatch, generate_content):
    from google import genai

    calls = {}

    class FakeClient:
        def __init__(self, *, api_key):
            calls["api_key"] = api_key
            self.aio = SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))

    monkeypatch.setattr(genai, "Client", FakeClient)
    return calls


@pytest.mark.asyncio
async def test_ocr_file_sends_the_image_and_returns_mistral_shape(monkeypatch, tmp_path):
    image = tmp_path / "card.jpg"
    image.write_bytes(b"jpeg-bytes")
    reply = '{"text": "Bay View", "tables": ["<table><tr><td>HOLE</td></tr></table>"]}'
    generate_content = AsyncMock(return_value=SimpleNamespace(text=reply))
    calls = _install_fake_client(monkeypatch, generate_content)

    result = await GeminiOCRService(api_key="key", model="gemini-test").ocr_file(image)

    assert result == {"pages": [{"markdown": "Bay View", "tables": [{"content": "<table><tr><td>HOLE</td></tr></table>"}]}]}
    assert calls["api_key"] == "key"
    request = generate_content.await_args.kwargs
    assert request["model"] == "gemini-test"
    image_part = request["contents"][0]
    assert image_part.inline_data.data == b"jpeg-bytes"
    assert image_part.inline_data.mime_type == "image/jpeg"
    assert request["config"].response_mime_type == "application/json"


@pytest.mark.asyncio
async def test_provider_error_becomes_runtime_error(monkeypatch, tmp_path):
    image = tmp_path / "card.png"
    image.write_bytes(b"png-bytes")
    _install_fake_client(monkeypatch, AsyncMock(side_effect=ValueError("402 RESOURCE_EXHAUSTED")))

    with pytest.raises(RuntimeError, match="Gemini OCR failed: 402 RESOURCE_EXHAUSTED"):
        await GeminiOCRService(api_key="key").ocr_file(image)
