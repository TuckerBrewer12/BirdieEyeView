import httpx
import pytest

import services.golfcourse_api_service as course_api_module
from services.golfcourse_api_service import (
    CourseProviderNotFound,
    CourseProviderUnavailable,
    GolfCourseAPIService,
    ProviderTee,
)
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
            "name": "Pebble Links",
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

    with pytest.raises(CourseProviderUnavailable, match="GolfCourseAPI search failed"):
        await service.search_external_courses("Pebble")


@pytest.mark.parametrize(
    ("club", "course", "expected"),
    [
        ("Alpha Golf Club", "North", "Alpha Golf Club North"),
        ("Pebble Beach Golf Links", "Pebble Beach Golf Links", "Pebble Beach Golf Links"),
        ("Spyglass", "Spyglass Hill", "Spyglass Hill"),
        (None, "North", "North"),
        ("", None, None),
    ],
)
def test_display_name_keeps_facility_identity(club, course, expected):
    assert course_api_module._display_name(club, course) == expected


def _detail_payload():
    # Shape confirmed against GET /v1/courses/{id} on November 2, 2026; values are synthetic.
    hole = lambda par, yards: {"par": par, "yardage": yards, "handicap": 1}  # noqa: E731
    return {
        "course": {
            "id": "42",
            "club_name": "Synthetic GC",
            "location": {"city": "Nowhere", "state": "CA"},
            "tees": {
                "male": [{"tee_name": "Blue", "course_rating": 72.1, "slope_rating": 130,
                          "holes": [hole(4, 400), hole(3, 180), hole(5, 520)]}],
                "female": [{"tee_name": "Red", "holes": [hole(4, 320), hole(4, 150), "bad"]},
                           {"tee_name": "Empty", "holes": []}],
            },
        }
    }


@pytest.mark.asyncio
async def test_course_details_returns_per_hole_tees_only(monkeypatch):
    FakeAsyncHttpClient.calls = []
    FakeAsyncHttpClient.response = FakeHttpResponse(_detail_payload())
    monkeypatch.setattr(course_api_module.httpx, "AsyncClient", FakeAsyncHttpClient)

    tees = await GolfCourseAPIService(api_key="key").get_course_details("4/2")

    assert FakeAsyncHttpClient.calls[0][1] == "/v1/courses/4%2F2"
    assert tees == [
        ProviderTee("male", "Blue", {1: 4, 2: 3, 3: 5}, {1: 400, 2: 180, 3: 520}, 72.1, 130),
        ProviderTee("female", "Red", {1: 4, 2: 4}, {1: 320, 2: 150}),
    ]


@pytest.mark.asyncio
async def test_course_details_distinguishes_not_found(monkeypatch):
    response = httpx.Response(404, request=httpx.Request("GET", "https://example.test/v1/courses/1"))
    FakeAsyncHttpClient.response = FakeHttpResponse(
        error=httpx.HTTPStatusError("missing", request=response.request, response=response)
    )
    monkeypatch.setattr(course_api_module.httpx, "AsyncClient", FakeAsyncHttpClient)

    with pytest.raises(CourseProviderNotFound):
        await GolfCourseAPIService(api_key="key").get_course_details("1")


@pytest.mark.parametrize(
    "response",
    [
        FakeHttpResponse(error=ValueError("network down")),
        FakeHttpResponse({"course": {"tees": {"male": []}}}),
        FakeHttpResponse("not json object"),
    ],
)
@pytest.mark.asyncio
async def test_course_details_unavailable_for_failures_and_missing_data(monkeypatch, response):
    FakeAsyncHttpClient.response = response
    monkeypatch.setattr(course_api_module.httpx, "AsyncClient", FakeAsyncHttpClient)

    with pytest.raises(CourseProviderUnavailable):
        await GolfCourseAPIService(api_key="key").get_course_details("1")


@pytest.mark.asyncio
async def test_course_details_requires_api_key(monkeypatch):
    monkeypatch.delenv("GOLFCOURSE_API_KEY", raising=False)
    monkeypatch.delenv("golfcourse_api_key", raising=False)

    with pytest.raises(CourseProviderUnavailable):
        await GolfCourseAPIService(api_key=None).get_course_details("1")
