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


# Pure table rules with many boundary shapes (Testing Priority 3a); the E2E captures prove the
# chain on real cards, these pin the individual rules.

SPANNED_TABLE = (
    "<table>"
    "<tr><th colspan='2'>HOLE</th><th>1</th><th>2</th></tr>"
    "<tr><td rowspan='2'>G</td><td>x</td><td>4</td><td>5</td></tr>"
    "<tr><td>y</td><td>2</td><td>1</td></tr>"
    "</table>"
)


@pytest.mark.parametrize("without_soup", [False, True])
def test_merged_cells_are_expanded_into_the_grid(monkeypatch, without_soup):
    if without_soup:
        monkeypatch.setattr(ocr_module, "BeautifulSoup", None)
    diagnostics = []

    rows = MistralOCRService._html_to_rows(SPANNED_TABLE, diagnostics)

    assert rows == [["HOLE", "", "1", "2"], ["G", "x", "4", "5"], ["", "y", "2", "1"]]
    assert diagnostics == ["ocr table 0: expanded 2 merged cell(s) into the grid"]


HEADER = ["HOLE", "1", "2", "3", "4", "5", "6", "7", "8", "9", "OUT", "INITIALS", "10", "11", "12", "13", "14", "15", "16", "17", "18", "IN", "TOT"]
FRONT = ["3", "4", "3", "4", "5", "4", "3", "4", "4"]
BACK = ["4", "3", "4", "4", "5", "4", "3", "4", "5"]


@pytest.mark.parametrize(
    ("row", "expected", "note"),
    [
        # wider by one: the player's name in its own cell
        (["", "D", *FRONT, "", "", *BACK, "", ""], ["D", *FRONT, "", "", *BACK, "", ""], "dropped 1 extra leading cell(s)"),
        # wider by one: a tee rating after the label
        (["Blue", "72.2/135", *FRONT, "34", "", *BACK, "36", "70"], ["Blue", *FRONT, "34", "", *BACK, "36", "70"], "dropped 1 extra leading cell(s)"),
        # wider, but the extra leading cell is a value: left alone
        (["7", "3", *FRONT, "", "", *BACK, "", ""], ["7", "3", *FRONT, "", "", *BACK, "", ""], "left unaligned"),
        # narrower by one: the separator column is missing from the data row
        (["D", *FRONT, "", *BACK, "", ""], ["D", *FRONT, "", "", *BACK, "", ""], "separator column(s) at [11]"),
        # same width, but the back nine sits one column early with a blank at the end
        (["D", *FRONT, "", *BACK, "", "", ""], ["D", *FRONT, "", "", *BACK, "", ""], "shifted right past the separator"),
        # narrower by three: the row stops at its last value
        (["Red", *FRONT, "34", "", *BACK], ["Red", *FRONT, "34", "", *BACK, "", ""], "padded 2 missing trailing cell(s)"),
    ],
)
def test_rows_are_aligned_to_the_hole_header(row, expected, note):
    diagnostics = []

    aligned = ocr_module.align_rows_to_header([HEADER, row], HEADER, diagnostics, where="t")

    assert aligned == [HEADER, expected]
    assert len(diagnostics) == 1 and note in diagnostics[0]


def test_narrower_row_missing_its_label_cells_is_padded_in_front():
    header = ["HOLE", "HDCP", "1", "2", "3", "4", "5", "6", "7", "8", "9", "OUT"]
    row = ["Par", "5", "3", "4", "3", "4", "3", "5", "4", "5", "36"]

    aligned = ocr_module.align_rows_to_header([header, row], header, None)

    assert aligned[1] == ["Par", "", "5", "3", "4", "3", "4", "3", "5", "4", "5", "36"]
