from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from api.request_models import HoleScoreInput, SaveRoundRequest, TeeInput
from models import Course, Hole, Tee, UserTee
from services.scan_service import ScanService


def make_scan_database():
    courses = SimpleNamespace(
        get_course=AsyncMock(return_value=None),
        find_course_by_external_id=AsyncMock(return_value=None),
        find_course_by_name=AsyncMock(return_value=None),
        find_user_course_by_name=AsyncMock(return_value=None),
        create_course=AsyncMock(return_value=None),
        update_course=AsyncMock(return_value=None),
        fill_course_gaps=AsyncMock(),
    )
    rounds = SimpleNamespace(create_round=AsyncMock())
    user_tees = SimpleNamespace(
        create_user_tee=AsyncMock(return_value=UserTee(id="tee-1", user_id="user-1", name="Blue"))
    )
    return SimpleNamespace(courses=courses, rounds=rounds, user_tees=user_tees)


def make_save_request(**overrides) -> SaveRoundRequest:
    payload = {
        "user_id": "user-1",
        "course_name": "Pebble Beach",
        "course_location": "Monterey, CA",
        "tee_box": "Blue",
        "tee_slope_rating": 125,
        "tee_course_rating": 72.0,
        "tee_yardages": {"1": 400, "2": 180},
        "hole_scores": [
            {"hole_number": 1, "strokes": 5, "putts": 2},
            {"hole_number": 2, "strokes": 4, "putts": 3},
        ],
        "course_holes": [
            {"hole_number": 1, "par": 4, "handicap": 1},
            {"hole_number": 2, "par": 3, "handicap": 18},
        ],
        "date": "2026-09-04T10:30:00",
        "notes": "Reviewed",
    }
    payload.update(overrides)
    return SaveRoundRequest.model_validate(payload)


def make_course(*, owner: str | None = None, external_id: str | None = None) -> Course:
    return Course(
        id=str(uuid4()),
        name="Pebble Beach",
        external_course_id=external_id,
        location="Monterey, CA",
        user_id=owner,
        holes=[
            Hole(number=1, par=4, handicap=1),
            Hole(number=2, par=3, handicap=18),
        ],
        tees=[
            Tee(
                color="Blue",
                slope_rating=125,
                course_rating=72,
                hole_yardages={1: 400, 2: 180},
            )
        ],
    )


def make_service(db=None, search_results=None):
    database = db or make_scan_database()
    provider = SimpleNamespace(search_external_courses=AsyncMock(return_value=search_results or []))
    return ScanService(database, provider), database, provider


async def save_reviewed_round():
    service, db, _ = make_service()
    course = make_course(owner="user-1")
    db.courses.find_course_by_name.return_value = course
    db.rounds.create_round.side_effect = lambda round_obj, *args, **kwargs: round_obj
    request = make_save_request()
    request.hole_scores[1] = HoleScoreInput.model_construct(hole_number=2, strokes=1, putts=3)
    return await service.save_reviewed_scan(request), course, db


@pytest.mark.asyncio
async def test_save_reviewed_scan_persists_round_metadata():
    saved, course, db = await save_reviewed_round()

    assert (saved.course, saved.date.isoformat()) == (
        course,
        "2026-09-04T10:30:00",
    )
    db.rounds.create_round.assert_awaited_once()


@pytest.mark.asyncio
async def test_save_reviewed_scan_normalizes_hole_scores():
    saved, _, _ = await save_reviewed_round()

    assert (
        saved.hole_scores[0].par_played,
        saved.hole_scores[0].handicap_played,
    ) == (4, 1)
    assert (saved.hole_scores[1].strokes, saved.hole_scores[1].putts) == (4, 3)


@pytest.mark.asyncio
async def test_explicit_course_resolution_returns_owned_course():
    service, db, _ = make_service()
    course_id = str(uuid4())
    owned = make_course(owner="user-1")
    db.courses.get_course.return_value = owned

    course, resolved_id = await service._resolve_course(make_save_request(course_id=course_id))

    assert (course, resolved_id) == (owned, owned.id)
    db.courses.fill_course_gaps.assert_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("repository_result", "repository_error", "message"),
    [
        (make_course(owner="other-user"), None, "not accessible"),
        (None, None, "not found"),
        (None, RuntimeError("db"), "invalid"),
    ],
)
async def test_explicit_course_resolution_rejects_invalid_course(repository_result, repository_error, message):
    service, db, _ = make_service()
    db.courses.get_course.return_value = repository_result
    db.courses.get_course.side_effect = repository_error

    with pytest.raises(ValueError, match=message):
        await service._resolve_course(make_save_request(course_id=str(uuid4())))


@pytest.mark.asyncio
async def test_resolution_prefers_external_id_match():
    service, db, _ = make_service()
    existing = make_course(owner="user-1")
    db.courses.find_course_by_external_id.return_value = existing

    resolved, _ = await service._resolve_course(make_save_request(external_course_id="ext-1"))

    assert resolved == existing


@pytest.mark.asyncio
async def test_resolution_falls_back_to_global_name_match():
    service, db, _ = make_service()
    existing = make_course(owner="user-1")
    db.courses.find_course_by_name.return_value = existing

    resolved, _ = await service._resolve_course(make_save_request(external_course_id="ext-1"))

    assert resolved == existing


@pytest.mark.asyncio
async def test_resolution_falls_back_to_user_course_name():
    service, db, _ = make_service()
    existing = make_course(owner="user-1")
    db.courses.find_user_course_by_name.return_value = existing

    resolved, _ = await service._resolve_course(make_save_request(external_course_id=None))

    assert resolved == existing


async def resolve_new_course():
    search_results = [
        {
            "external_course_id": "ext-1",
            "name": "Pebble Beach Golf Links",
            "city": "Monterey",
            "state": "CA",
        }
    ]
    service, db, _ = make_service(search_results=search_results)
    created = make_course(owner="user-1", external_id="ext-1")
    db.courses.create_course.return_value = created
    request = make_save_request(
        course_location=None,
        tee_box=None,
        all_tees=[
            {
                "color": "Gold",
                "slope_rating": 120,
                "course_rating": 70,
                "hole_yardages": {"1": 390},
            }
        ],
    )
    resolved = await service._resolve_course(request)
    return resolved, request, db, created


@pytest.mark.asyncio
async def test_new_course_resolution_enriches_request():
    (course, course_id), request, _, created = await resolve_new_course()

    assert (course, course_id) == (created, created.id)
    assert (
        request.external_course_id,
        request.course_location,
        request.tee_box,
    ) == ("ext-1", "Monterey, CA", "Gold")


@pytest.mark.asyncio
async def test_new_course_resolution_builds_holes_and_tees():
    _, _, db, _ = await resolve_new_course()

    course_to_create = db.courses.create_course.await_args.args[0]

    assert course_to_create.holes[0].par == 4
    assert course_to_create.tees[0].hole_yardages == {1: 390}


@pytest.mark.asyncio
async def test_external_lookup_selects_strong_name_match():
    service, _, _ = make_service(
        search_results=[
            {"external_course_id": None, "name": "Ignored"},
            {"external_course_id": "weak", "name": "Pebble Resort"},
            {
                "external_course_id": "match",
                "name": "Pebble Beach Golf Course",
                "city": "Monterey",
            },
        ]
    )

    result = await service._maybe_lookup_external_id_from_name(make_save_request(course_location=None))

    assert result == ("match", "Monterey")


@pytest.mark.asyncio
async def test_external_lookup_skips_existing_external_id():
    service, _, provider = make_service()

    result = await service._maybe_lookup_external_id_from_name(make_save_request(external_course_id="already"))

    assert result == (None, None)
    provider.search_external_courses.assert_not_awaited()


@pytest.mark.asyncio
async def test_external_lookup_handles_empty_results():
    service, _, _ = make_service()

    result = await service._maybe_lookup_external_id_from_name(make_save_request())

    assert result == (None, None)


@pytest.mark.asyncio
async def test_external_lookup_handles_provider_failure():
    service, _, provider = make_service()
    provider.search_external_courses.side_effect = RuntimeError("down")

    result = await service._maybe_lookup_external_id_from_name(make_save_request())

    assert result == (None, None)


@pytest.mark.asyncio
async def test_backfill_external_id_returns_updated_course():
    service, db, _ = make_service()
    course = make_course(owner="user-1")
    updated = course.model_copy(update={"external_course_id": "ext-1"})
    db.courses.update_course.return_value = updated

    result = await service._maybe_backfill_external_id(course, make_save_request(external_course_id="ext-1"))

    assert result == updated


@pytest.mark.asyncio
async def test_fill_gaps_delegates_to_course_repository():
    service, db, _ = make_service()
    request = make_save_request()

    await service._fill_gaps(
        make_course(owner="user-1"),
        request.course_holes,
        service._build_tees(request),
        "user-1",
    )

    db.courses.fill_course_gaps.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_user_tee_maps_request_yardages():
    service, db, _ = make_service()

    tee_id = await service._maybe_create_user_tee(make_save_request(), None)

    assert tee_id == "tee-1"
    created = db.user_tees.create_user_tee.await_args.args[0]
    assert created.hole_yardages == {1: 400, 2: 180}


@pytest.mark.asyncio
async def test_create_user_tee_skips_linked_course():
    service, _, _ = make_service()

    assert await service._maybe_create_user_tee(make_save_request(), str(uuid4())) is None


@pytest.mark.parametrize(("label", "expected"), [("WHITE M 69/123", "white"), ("", None)])
def test_extract_tee_color_token(label, expected):
    service, _, _ = make_service()

    assert service._extract_tee_color_token(label) == expected


def test_tee_input_yardages_omit_missing_values():
    service, _, _ = make_service()
    tee = TeeInput(color="Blue", hole_yardages={"1": 400, "2": None})

    assert service._tee_input_yardages(tee) == {1: 400}


@pytest.mark.parametrize(
    ("left", "right", "expected"),
    [
        ({}, {1: 1}, (0.0, 0)),
        ({1: 400}, {2: 400}, (0.0, 0)),
        ({1: 400, 2: 200}, {1: 410, 2: 250}, (0.5, 2)),
    ],
)
def test_tee_yardage_similarity(left, right, expected):
    service, _, _ = make_service()

    assert service._tee_yardage_similarity(left, right) == expected


def test_build_par_lookup_prefers_course_values():
    service, _, _ = make_service()

    par_by_hole, handicap_by_hole = service._build_par_lookup(make_save_request(), make_course())

    assert par_by_hole == {1: 4, 2: 3}
    assert handicap_by_hole == {1: 1, 2: 18}


def test_build_hole_scores_drops_putts_above_strokes():
    service, _, _ = make_service()
    request = make_save_request(
        course_name=None,
        course_location=None,
        course_holes=None,
        hole_scores=[{"hole_number": 1, "strokes": 2, "putts": 2}],
    )
    request.hole_scores[0] = HoleScoreInput.model_construct(hole_number=1, strokes=2, putts=3)

    scores = service._build_hole_scores(request, {}, {})

    assert (scores[0].strokes, scores[0].putts) == (2, None)


def test_build_tees_uses_selected_tee_fallback():
    service, _, _ = make_service()

    tees = service._build_tees(make_save_request(all_tees=[]))

    assert tees[0].color == "Blue"


def test_build_tees_returns_empty_without_tee_data():
    service, _, _ = make_service()

    assert service._build_tees(make_save_request(tee_box=None, all_tees=None)) == []
