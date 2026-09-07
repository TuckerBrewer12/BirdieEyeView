from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from api.request_models import HoleScoreInput, SaveRoundRequest, TeeInput
from models import Course, Hole, Tee, UserTee
from services.scan_service import ScanService


def _make_scan_database():
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
        create_user_tee=AsyncMock(
            return_value=UserTee(id="tee-1", user_id="user-1", name="Blue")
        )
    )
    return SimpleNamespace(courses=courses, rounds=rounds, user_tees=user_tees)


def _make_save_request(**overrides) -> SaveRoundRequest:
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


def _make_course(*, owner: str | None = None, external_id: str | None = None) -> Course:
    return Course(
        id=str(uuid4()),
        name="Pebble Beach",
        external_course_id=external_id,
        location="Monterey, CA",
        user_id=owner,
        holes=[Hole(number=1, par=4, handicap=1), Hole(number=2, par=3, handicap=18)],
        tees=[Tee(color="Blue", slope_rating=125, course_rating=72, hole_yardages={1: 400, 2: 180})],
    )


@pytest.mark.asyncio
async def test_save_reviewed_scan_persists_normalized_round():
    db = _make_scan_database()
    course = _make_course(owner="user-1")
    db.courses.find_course_by_name.return_value = course
    db.rounds.create_round.side_effect = lambda round_obj, *args, **kwargs: round_obj
    provider = SimpleNamespace(search_external_courses=AsyncMock(return_value=[]))
    scan_service = ScanService(db, provider)

    request = _make_save_request()
    request.hole_scores[1] = HoleScoreInput.model_construct(
        hole_number=2,
        strokes=1,
        putts=3,
    )
    saved = await scan_service.save_reviewed_scan(request)

    assert saved.course == course
    assert saved.date.isoformat() == "2026-09-04T10:30:00"
    assert saved.hole_scores[0].par_played == 4
    assert saved.hole_scores[0].handicap_played == 1
    assert saved.hole_scores[1].strokes == 4
    assert saved.hole_scores[1].putts == 3
    db.rounds.create_round.assert_awaited_once()


@pytest.mark.asyncio
async def test_explicit_course_resolution_and_access_errors():
    db = _make_scan_database()
    provider = SimpleNamespace(search_external_courses=AsyncMock(return_value=[]))
    scan_service = ScanService(db, provider)
    course_id = str(uuid4())
    request = _make_save_request(course_id=course_id)
    owned = _make_course(owner="user-1")
    db.courses.get_course.return_value = owned

    course, resolved_id = await scan_service._resolve_course(request)
    assert course == owned
    assert resolved_id == owned.id
    db.courses.fill_course_gaps.assert_awaited()

    db.courses.get_course.return_value = _make_course(owner="other-user")
    with pytest.raises(ValueError, match="not accessible"):
        await scan_service._resolve_course(_make_save_request(course_id=course_id))

    db.courses.get_course.return_value = None
    with pytest.raises(ValueError, match="not found"):
        await scan_service._resolve_course(_make_save_request(course_id=course_id))

    db.courses.get_course.side_effect = RuntimeError("db")
    with pytest.raises(ValueError, match="invalid"):
        await scan_service._resolve_course(_make_save_request(course_id=course_id))


@pytest.mark.asyncio
async def test_external_and_name_resolution_tiers():
    db = _make_scan_database()
    provider = SimpleNamespace(search_external_courses=AsyncMock(return_value=[]))
    scan_service = ScanService(db, provider)
    existing = _make_course(owner="user-1")

    db.courses.find_course_by_external_id.return_value = existing
    resolved, _ = await scan_service._resolve_course(_make_save_request(external_course_id="ext-1"))
    assert resolved == existing

    db.courses.find_course_by_external_id.return_value = None
    db.courses.find_course_by_name.side_effect = [existing]
    resolved, _ = await scan_service._resolve_course(_make_save_request(external_course_id="ext-1"))
    assert resolved == existing

    db.courses.find_course_by_name.side_effect = None
    db.courses.find_course_by_name.return_value = None
    db.courses.find_user_course_by_name.return_value = existing
    resolved, _ = await scan_service._resolve_course(_make_save_request(external_course_id=None))
    assert resolved == existing


@pytest.mark.asyncio
async def test_new_course_resolution_builds_holes_and_tees():
    db = _make_scan_database()
    created_course = _make_course(owner="user-1", external_id="ext-1")
    db.courses.create_course.return_value = created_course
    provider = SimpleNamespace(search_external_courses=AsyncMock(return_value=[{
        "external_course_id": "ext-1",
        "name": "Pebble Beach Golf Links",
        "city": "Monterey",
        "state": "CA",
    }]))
    scan_service = ScanService(db, provider)
    request = _make_save_request(course_location=None, tee_box=None, all_tees=[{
        "color": "Gold",
        "slope_rating": 120,
        "course_rating": 70,
        "hole_yardages": {"1": 390},
    }])

    course, course_id = await scan_service._resolve_course(request)

    assert course == created_course
    assert course_id == created_course.id
    assert request.external_course_id == "ext-1"
    assert request.course_location == "Monterey, CA"
    assert request.tee_box == "Gold"
    course_to_create = db.courses.create_course.await_args.args[0]
    assert course_to_create.holes[0].par == 4
    assert course_to_create.tees[0].hole_yardages == {1: 390}


@pytest.mark.asyncio
async def test_external_lookup_handles_overlap_empty_and_failure():
    db = _make_scan_database()
    provider = SimpleNamespace(search_external_courses=AsyncMock(return_value=[
        {"external_course_id": None, "name": "Ignored"},
        {"external_course_id": "weak", "name": "Pebble Resort"},
        {"external_course_id": "match", "name": "Pebble Beach Golf Course", "city": "Monterey"},
    ]))
    scan_service = ScanService(db, provider)

    assert await scan_service._maybe_lookup_external_id_from_name(_make_save_request(course_location=None)) == (
        "match",
        "Monterey",
    )
    assert await scan_service._maybe_lookup_external_id_from_name(_make_save_request(external_course_id="already")) == (None, None)
    provider.search_external_courses.return_value = []
    assert await scan_service._maybe_lookup_external_id_from_name(_make_save_request()) == (None, None)
    provider.search_external_courses.side_effect = RuntimeError("down")
    assert await scan_service._maybe_lookup_external_id_from_name(_make_save_request()) == (None, None)


@pytest.mark.asyncio
async def test_backfill_fill_gaps_and_user_tee_creation():
    db = _make_scan_database()
    scan_service = ScanService(db, SimpleNamespace(search_external_courses=AsyncMock(return_value=[])))
    course = _make_course(owner="user-1")
    course_with_external_id = course.model_copy(update={"external_course_id": "ext-1"})
    db.courses.update_course.return_value = course_with_external_id
    request = _make_save_request(external_course_id="ext-1")

    assert await scan_service._maybe_backfill_external_id(course, request) == course_with_external_id
    await scan_service._fill_gaps(course, request.course_holes, scan_service._build_tees(request), "user-1")
    db.courses.fill_course_gaps.assert_awaited()

    tee_id = await scan_service._maybe_create_user_tee(request, None)
    assert tee_id == "tee-1"
    user_tee_to_create = db.user_tees.create_user_tee.await_args.args[0]
    assert user_tee_to_create.hole_yardages == {1: 400, 2: 180}
    assert await scan_service._maybe_create_user_tee(request, course.id) is None


def test_scan_helpers_cover_fallbacks_and_score_guards():
    scan_service = ScanService(_make_scan_database(), SimpleNamespace())
    assert scan_service._extract_tee_color_token("WHITE M 69/123") == "white"
    assert scan_service._extract_tee_color_token("") is None
    assert scan_service._tee_input_yardages(TeeInput(color="Blue", hole_yardages={"1": 400, "2": None})) == {1: 400}
    assert scan_service._tee_yardage_similarity({}, {1: 1}) == (0.0, 0)
    assert scan_service._tee_yardage_similarity({1: 400}, {2: 400}) == (0.0, 0)
    assert scan_service._tee_yardage_similarity({1: 400, 2: 200}, {1: 410, 2: 250}) == (0.5, 2)

    course = _make_course()
    request = _make_save_request()
    par_by_hole, handicap_by_hole = scan_service._build_par_lookup(request, course)
    assert par_by_hole == {1: 4, 2: 3}
    assert handicap_by_hole == {1: 1, 2: 18}

    no_par_request = _make_save_request(
        course_name=None,
        course_location=None,
        course_holes=None,
        hole_scores=[{"hole_number": 1, "strokes": 2, "putts": 2}],
    )
    no_par_request.hole_scores[0] = HoleScoreInput.model_construct(
        hole_number=1,
        strokes=2,
        putts=3,
    )
    hole_scores = scan_service._build_hole_scores(no_par_request, {}, {})
    assert hole_scores[0].strokes == 2
    assert hole_scores[0].putts is None

    assert scan_service._build_tees(_make_save_request(all_tees=[]))[0].color == "Blue"
    assert scan_service._build_tees(_make_save_request(tee_box=None, all_tees=None)) == []
