import pytest

import services.mistral_ocr_service as ocr_module
from services.mistral_ocr_service import MistralOCRService
from tests.helpers import FakeAsyncHttpClient, FakeHttpResponse


def make_ocr_response():
    return {
        "pages": [
            {
                "tables": [
                    {"content": "<table><tr><th>Hole</th><th>1</th></tr><tr><td>Par</td><td>4</td></tr></table>"}
                ],
                "markdown": "| ignored |\n| --- |\nCourse note",
            },
            {"text": "Second page"},
            "invalid",
        ]
    }


def test_markdown_extraction_combines_page_content():
    markdown = MistralOCRService.extract_markdown_text(make_ocr_response())

    assert "| Hole | 1 |" in markdown
    assert "Course note" in markdown and "Second page" in markdown


@pytest.mark.parametrize(
    ("response", "expected"),
    [({"markdown": "plain"}, "plain"), ({"pages": "bad"}, "")],
)
def test_markdown_extraction_handles_top_level_shapes(response, expected):
    assert MistralOCRService.extract_markdown_text(response) == expected


@pytest.mark.parametrize(("rows", "expected"), [([], ""), ([["a|b"]], "| a/b |")])
def test_rows_to_markdown_escapes_cells(rows, expected):
    assert MistralOCRService._rows_to_markdown(rows) == expected


def test_html_parser_falls_back_without_beautiful_soup(monkeypatch):
    monkeypatch.setattr(ocr_module, "BeautifulSoup", None)

    rows = MistralOCRService._html_to_rows("<TABLE><TR><TD> A  B </TD><TD>4</TD></TR></TABLE>")

    assert rows == [["A B", "4"]]


@pytest.mark.asyncio
async def test_ocr_file_builds_provider_payload(monkeypatch, tmp_path):
    image = tmp_path / "card.png"
    image.write_bytes(b"png")
    FakeAsyncHttpClient.calls = []
    FakeAsyncHttpClient.response = FakeHttpResponse({"pages": []})
    monkeypatch.setattr(ocr_module.httpx, "AsyncClient", FakeAsyncHttpClient)
    service = MistralOCRService(api_key="key", ocr_path="v1/ocr")

    response = await service.ocr_file(
        image,
        pages="0-1",
        include_images=True,
        include_headers=True,
        include_footers=True,
    )

    assert response == {"pages": []}
    payload = FakeAsyncHttpClient.calls[0][2]["json"]
    assert payload["document"]["document_url"].startswith("data:image/png;base64,")
    assert (payload["pages"], payload["include_headers"], payload["include_footers"]) == (
        "0-1",
        True,
        True,
    )


@pytest.mark.asyncio
async def test_ocr_file_requires_api_key(monkeypatch, tmp_path):
    image = tmp_path / "card.png"
    image.write_bytes(b"png")
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)

    with pytest.raises(EnvironmentError):
        await MistralOCRService(api_key=None).ocr_file(image)


@pytest.mark.asyncio
async def test_ocr_file_requires_existing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        await MistralOCRService(api_key="key").ocr_file(tmp_path / "missing.jpg")


@pytest.mark.asyncio
async def test_ocr_file_wraps_provider_failure(monkeypatch, tmp_path):
    image = tmp_path / "card.png"
    image.write_bytes(b"png")
    FakeAsyncHttpClient.response = FakeHttpResponse(error=ValueError("bad response"))
    monkeypatch.setattr(ocr_module.httpx, "AsyncClient", FakeAsyncHttpClient)

    with pytest.raises(RuntimeError, match="Mistral OCR failed"):
        await MistralOCRService(api_key="key").ocr_file(image)
