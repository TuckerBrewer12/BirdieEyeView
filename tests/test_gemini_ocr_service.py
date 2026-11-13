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
