import pytest

import services.golfcourse_api_service as course_api_module
from services.golfcourse_api_service import GolfCourseAPIService
from tests.helpers import FakeAsyncHttpClient, FakeHttpResponse


def test_course_name_normalization_removes_provider_terms():
    assert course_api_module._normalize_course_name("Pebble Beach Golf Links!") == "pebble beach"


def test_search_query_normalization_trims_whitespace():
    service = GolfCourseAPIService(api_key="key")

    assert service._normalize_search_query(" Golf Club ") == "Golf Club"


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        ([{"id": 1}, "bad"], [{"id": 1}]),
        ({"data": {"courses": [{"id": 2}]}}, [{"id": 2}]),
        ({"results": [{"id": 3}]}, [{"id": 3}]),
        ("bad", []),
    ],
)
def test_extract_items_accepts_supported_provider_shape(payload, expected):
    assert GolfCourseAPIService(api_key="key")._extract_items(payload) == expected


def test_normalize_items_maps_provider_course_fields():
    service = GolfCourseAPIService(api_key="key")
    source = {
        "course": {"course_id": 1},
        "club_name": "Pebble",
        "course_name": "Links",
        "location": {"city": "Monterey", "state": "CA"},
    }

    rows = service._normalize_items(
        [source, {"uuid": "two", "name": "Spyglass", "city": "Pebble Beach"}],
        limit=1,
    )

    assert rows == [
        {
            "external_course_id": "1",
            "name": "Links",
            "city": "Monterey",
            "state": "CA",
            "source": "golfcourseapi",
            "raw": source,
        }
    ]


@pytest.mark.parametrize(
    ("item", "expected"),
    [({"facility": {"club_id": "nested"}}, "nested"), ({}, None)],
)
def test_extract_external_id_supports_nested_provider_shape(item, expected):
    service = GolfCourseAPIService(api_key="key")

    assert service._extract_external_id(item) == expected


@pytest.mark.asyncio
async def test_course_search_ignores_short_query():
    assert await GolfCourseAPIService(api_key="key").search_external_courses("x") == []


@pytest.mark.asyncio
async def test_course_search_normalizes_provider_response(monkeypatch):
    FakeAsyncHttpClient.calls = []
    FakeAsyncHttpClient.response = FakeHttpResponse({"courses": [{"id": 1, "name": "Pebble Beach"}]})
    monkeypatch.setattr(course_api_module.httpx, "AsyncClient", FakeAsyncHttpClient)
    service = GolfCourseAPIService(api_key="key", search_path="v1/search")

    results = await service.search_external_courses("Pebble Beach", limit=2)

    assert results[0]["external_course_id"] == "1"
    assert FakeAsyncHttpClient.calls[0][1] == "/v1/search"


@pytest.mark.asyncio
async def test_course_search_requires_api_key(monkeypatch):
    monkeypatch.delenv("GOLFCOURSE_API_KEY", raising=False)
    monkeypatch.delenv("golfcourse_api_key", raising=False)

    with pytest.raises(EnvironmentError):
        await GolfCourseAPIService(api_key=None).search_external_courses("Pebble")


@pytest.mark.asyncio
async def test_course_search_wraps_provider_failure(monkeypatch):
    FakeAsyncHttpClient.response = FakeHttpResponse(error=ValueError("provider down"))
    monkeypatch.setattr(course_api_module.httpx, "AsyncClient", FakeAsyncHttpClient)
    service = GolfCourseAPIService(api_key="key")

    with pytest.raises(RuntimeError, match="GolfCourseAPI search failed"):
        await service.search_external_courses("Pebble")
