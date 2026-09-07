from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

import services.ai_service as ai_module
import services.gemini_table_merger as gemini_merger
import services.golfcourse_api_service as course_api_module
import services.mistral_ocr_service as ocr_module
from models import HoleScore, Round, User
from services.ai_service import AIService
from services.golfcourse_api_service import GolfCourseAPIService
from services.mistral_ocr_service import MistralOCRService


class _Response:
    def __init__(self, payload=None, error: Exception | None = None):
        self._payload = payload
        self._error = error

    def raise_for_status(self):
        if self._error:
            raise self._error

    def json(self):
        return self._payload


class _AsyncClient:
    response = _Response({})
    calls = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, path, **kwargs):
        self.calls.append(("get", path, kwargs))
        return self.response

    async def post(self, path, **kwargs):
        self.calls.append(("post", path, kwargs))
        return self.response


def _make_golf_round(offset: int = 0) -> Round:
    scores = []
    for hole in range(1, 19):
        par = 3 if hole <= 4 else 4 if hole <= 14 else 5
        scores.append(HoleScore(
            hole_number=hole,
            par_played=par,
            strokes=min(15, par + 1 + (offset % 2)),
            putts=2 + (1 if hole % 6 == 0 else 0),
            green_in_regulation=hole % 3 == 0,
        ))
    return Round(id=f"r-{offset}", hole_scores=scores)


def test_course_api_normalization_and_response_shapes():
    course_api = GolfCourseAPIService(api_key="key")
    assert course_api_module._normalize_course_name("Pebble Beach Golf Links!") == "pebble beach"
    assert course_api._normalize_search_query(" Golf Club ") == "Golf Club"
    assert course_api._extract_items([{"id": 1}, "bad"]) == [{"id": 1}]
    assert course_api._extract_items({"data": {"courses": [{"id": 2}]}}) == [{"id": 2}]
    assert course_api._extract_items({"results": [{"id": 3}]}) == [{"id": 3}]
    assert course_api._extract_items("bad") == []

    rows = course_api._normalize_items([
        {"course": {"course_id": 1}, "club_name": "Pebble", "course_name": "Links", "location": {"city": "Monterey", "state": "CA"}},
        {"uuid": "two", "name": "Spyglass", "city": "Pebble Beach"},
    ], limit=1)
    assert rows == [{
        "external_course_id": "1",
        "name": "Links",
        "city": "Monterey",
        "state": "CA",
        "source": "golfcourseapi",
        "raw": {"course": {"course_id": 1}, "club_name": "Pebble", "course_name": "Links", "location": {"city": "Monterey", "state": "CA"}},
    }]
    assert course_api._extract_external_id({"facility": {"club_id": "nested"}}) == "nested"
    assert course_api._extract_external_id({}) is None


@pytest.mark.asyncio
async def test_course_api_search_success_and_failures(monkeypatch):
    _AsyncClient.calls = []
    _AsyncClient.response = _Response({"courses": [{"id": 1, "name": "Pebble Beach"}]})
    monkeypatch.setattr(course_api_module.httpx, "AsyncClient", _AsyncClient)
    course_api = GolfCourseAPIService(api_key="key", search_path="v1/search")

    assert await course_api.search_external_courses("x") == []
    search_results = await course_api.search_external_courses("Pebble Beach", limit=2)
    assert search_results[0]["external_course_id"] == "1"
    assert _AsyncClient.calls[0][1] == "/v1/search"

    monkeypatch.delenv("GOLFCOURSE_API_KEY", raising=False)
    monkeypatch.delenv("golfcourse_api_key", raising=False)
    with pytest.raises(EnvironmentError):
        await GolfCourseAPIService(api_key=None).search_external_courses("Pebble")

    _AsyncClient.response = _Response(error=ValueError("provider down"))
    with pytest.raises(RuntimeError, match="GolfCourseAPI search failed"):
        await course_api.search_external_courses("Pebble")


def test_mistral_markdown_extraction_and_html_fallback(monkeypatch):
    response = {
        "pages": [
            {
                "tables": [{"content": "<table><tr><th>Hole</th><th>1</th></tr><tr><td>Par</td><td>4</td></tr></table>"}],
                "markdown": "| ignored |\n| --- |\nCourse note",
            },
            {"text": "Second page"},
            "invalid",
        ]
    }
    markdown = MistralOCRService.extract_markdown_text(response)
    assert "| Hole | 1 |" in markdown
    assert "Course note" in markdown
    assert "Second page" in markdown
    assert MistralOCRService.extract_markdown_text({"markdown": "plain"}) == "plain"
    assert MistralOCRService.extract_markdown_text({"pages": "bad"}) == ""
    assert MistralOCRService._rows_to_markdown([]) == ""
    assert MistralOCRService._rows_to_markdown([["a|b"]]) == "| a/b |"

    monkeypatch.setattr(ocr_module, "BeautifulSoup", None)
    rows = MistralOCRService._html_to_rows("<TABLE><TR><TD> A  B </TD><TD>4</TD></TR></TABLE>")
    assert rows == [["A B", "4"]]


@pytest.mark.asyncio
async def test_mistral_ocr_file_payload_and_errors(monkeypatch, tmp_path):
    image = tmp_path / "card.png"
    image.write_bytes(b"png")
    _AsyncClient.calls = []
    _AsyncClient.response = _Response({"pages": []})
    monkeypatch.setattr(ocr_module.httpx, "AsyncClient", _AsyncClient)
    ocr_service = MistralOCRService(api_key="key", ocr_path="v1/ocr")

    ocr_response = await ocr_service.ocr_file(
        image,
        pages="0-1",
        include_images=True,
        include_headers=True,
        include_footers=True,
    )
    assert ocr_response == {"pages": []}
    payload = _AsyncClient.calls[0][2]["json"]
    assert payload["document"]["document_url"].startswith("data:image/png;base64,")
    assert payload["pages"] == "0-1"
    assert payload["include_headers"] is True
    assert payload["include_footers"] is True

    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
    with pytest.raises(EnvironmentError):
        await MistralOCRService(api_key=None).ocr_file(image)
    with pytest.raises(FileNotFoundError):
        await ocr_service.ocr_file(tmp_path / "missing.jpg")
    _AsyncClient.response = _Response(error=ValueError("bad response"))
    with pytest.raises(RuntimeError, match="Mistral OCR failed"):
        await ocr_service.ocr_file(image)


@pytest.mark.asyncio
async def test_gemini_merge_success_empty_and_failure(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    assert await gemini_merger.merge_split_tables("original") == "original"

    from google import genai

    response = SimpleNamespace(text="```markdown\n| merged |\n```")
    client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=AsyncMock(return_value=response))))
    monkeypatch.setattr(genai, "Client", lambda api_key: client)
    monkeypatch.setenv("GOOGLE_API_KEY", "key")
    assert await gemini_merger.merge_split_tables("original") == "| merged |"

    response.text = ""
    assert await gemini_merger.merge_split_tables("original") == "original"
    client.aio.models.generate_content.side_effect = RuntimeError("down")
    assert await gemini_merger.merge_split_tables("original") == "original"


def test_ai_benchmark_trends_and_raw_pipeline():
    assert ai_module._get_benchmark(None)[1] == "Unrated"
    assert ai_module._get_benchmark(7)[1] == "5–10 HCP"
    assert ai_module._get_benchmark(60)[1] == "28–54 HCP"
    assert ai_module._trend_direction([1, 1, 1]) == "stable"
    assert ai_module._trend_direction([4, 3, 2, 1]) == "improving"
    assert ai_module._trend_direction([1, 2, 3, 4], lower_is_better=False) == "improving"
    assert ai_module._trend_direction([1, 1, 1, 1], threshold=0.5) == "stable"

    ai_service = AIService(SimpleNamespace())
    raw_metrics = ai_service._compute_raw([_make_golf_round(i) for i in range(6)])
    assert raw_metrics["num_rounds"] == 6
    assert raw_metrics["gir_pct"] is not None
    assert set(raw_metrics["par_avgs"]) == {3, 4, 5}
    assert len(raw_metrics["putts_per_gir_trend"]) == 6


@pytest.mark.asyncio
async def test_ai_suggestions_empty_and_populated(monkeypatch):
    user = User(id="u1", handicap=12)
    db = SimpleNamespace(
        users=SimpleNamespace(get_user=AsyncMock(return_value=user)),
        rounds=SimpleNamespace(get_rounds_for_user=AsyncMock(return_value=[])),
    )
    ai_service = AIService(db)
    empty_suggestions = await ai_service.generate_suggestions("u1")
    assert empty_suggestions.rounds_analyzed == 0
    assert empty_suggestions.insights == []

    db.rounds.get_rounds_for_user.return_value = [_make_golf_round(i) for i in range(6)]
    raw_metrics = {
        "gir_pct": 5.0,
        "putts_per_gir": 3.0,
        "avg_scrambling": 5.0,
        "avg_three_putts": 7.0,
        "avg_putts_per_round": 40.0,
        "avg_to_par": 30.0,
        "par_avgs": {3: 3.0, 4: 4.0, 5: 3.0},
        "par_counts": {3: 24, 4: 60, 5: 24},
        "par_avgs_trend": {3: [1, 2, 3, 4], 4: [1, 2, 3, 4], 5: [1, 2, 3, 4]},
        "gir_values": [30, 20, 10, 5],
        "three_putt_trend": [1, 2, 3, 4],
        "putts_per_gir_trend": [1, 2, 3, 4],
        "scrambling_rounds_with_data": 6,
        "num_rounds": 6,
    }
    monkeypatch.setattr(ai_service, "_compute_raw", lambda rounds: raw_metrics)
    populated_suggestions = await ai_service.generate_suggestions("u1", target_handicap=5.0)
    assert populated_suggestions.rounds_analyzed == 6
    assert populated_suggestions.handicap_range_label == "Breaks 80"
    assert {item.title for item in populated_suggestions.insights} >= {
        "Hit More Greens",
        "Build Your Short Game",
        "Eliminate 3-Putts",
        "Improve Putts per GIR",
    }
    assert [item.metric for item in populated_suggestions.comparisons] == [
        "Scoring Avg (to par)",
        "GIR %",
        "Par 3 Avg to Par",
        "Par 4 Avg to Par",
        "Par 5 Avg to Par",
        "Up & Down %",
        "Putts per Round",
        "Putts per GIR",
        "3-Putts per Round",
    ]
    gir_comparison = populated_suggestions.comparisons[1]
    assert gir_comparison.player_value == 5.0
    assert gir_comparison.lower_is_better is False
    assert gir_comparison.has_data is True


def test_ai_strengths_and_non_actionable_insights():
    ai_service = AIService(SimpleNamespace())
    benchmark, _ = ai_module._get_benchmark(10)
    strong_metrics = {
        "gir_pct": 80.0,
        "avg_scrambling": 80.0,
        "putts_per_gir": 1.0,
        "par_avgs": {3: -1.0, 4: -1.0, 5: -1.0},
    }
    strengths = ai_service._compute_strengths(strong_metrics, benchmark)
    assert [strength.title for strength in strengths] == [
        "Strong Ball Striking",
        "Excellent Short Game",
        "Great on the Greens",
    ]
    assert strengths[0].player_value == 80.0
    assert strengths[0].benchmark_value == round(benchmark["gir_pct"], 1)
    assert strengths[2].margin_description == (
        f"{round(benchmark['putts_per_gir'] - 1.0, 2)} fewer putts than benchmark"
    )
    assert ai_service._insight_par_performance({}, benchmark) is None
    assert ai_service._insight_gir({"gir_pct": None}, benchmark) is None
    assert ai_service._insight_scrambling({"avg_scrambling": 1, "scrambling_rounds_with_data": 2}, benchmark) is None
    assert ai_service._insight_three_putts({"avg_three_putts": None}, benchmark) is None
    assert ai_service._insight_putting_quality({"putts_per_gir": None}, benchmark) is None
