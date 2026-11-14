from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from analytics import handicap as hcap
from api.main import app
from api.round_responses import round_summary
from api.routers import ai_insights, courses, rounds, stats, users
from database.exceptions import DuplicateError, IntegrityError, NotFoundError
from models import Course, Hole, HoleScore, Round, User, UserTee
from models.course import CourseSummary
from tests.helpers import make_course, make_http_request, make_mock_database, make_user
from tests.route_fixtures import (
    friendship_row,
    listed_round,
    pebble_beach,
    pebble_beach_summary,
    played_round,
    profile_user,
)


@pytest.mark.asyncio
async def test_list_courses_requires_user_for_private_filter():
    with pytest.raises(HTTPException) as raised:
        await courses.list_courses(20, 0, uuid4(), make_mock_database(), None)

    assert raised.value.status_code == 403


@pytest.mark.asyncio
async def test_get_course_returns_not_found():
    db = make_mock_database()
    db.courses.get_course = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as raised:
        await courses.get_course(uuid4(), db, None)

    assert raised.value.status_code == 404


@pytest.mark.asyncio
async def test_course_search_rejects_unsafe_query():
    with pytest.raises(HTTPException) as raised:
        await courses.search_courses("x --", None, False, make_mock_database(), None)

    assert raised.value.status_code == 422


def make_create_request():
    return courses.CreateCourseRequest(
        name=" pebble BEACH ",
        location="Monterey",
        holes=[{"number": 1, "par": 4, "handicap": 1}],
        tees=[{"color": "Blue", "hole_yardages": {1: 400}}],
    )


@pytest.mark.asyncio
async def test_create_course_assigns_owner():
    user_id = uuid4()
    course_id = uuid4()
    db = make_mock_database()
    db.courses.create_course = AsyncMock(return_value=make_course(course_id, owner=user_id))

    response = await courses.create_course(make_create_request(), None, db, make_user(user_id))

    assert response.id == str(course_id)
    assert db.courses.create_course.await_args.kwargs["user_id"] == str(user_id)


@pytest.mark.asyncio
async def test_update_course_normalizes_name():
    user_id = uuid4()
    course_id = uuid4()
    course = make_course(course_id, owner=user_id)
    db = make_mock_database()
    db.courses.get_course = AsyncMock(return_value=course)
    db.courses.update_course = AsyncMock(return_value=course)

    response = await courses.update_course(
        course_id, courses.UpdateCourseRequest(name="new NAME"), db, make_user(user_id)
    )

    assert response.name == course.name
    assert db.courses.update_course.await_args.kwargs["name"] == "New Name"


@pytest.mark.asyncio
async def test_clone_course_returns_created_course():
    user_id = uuid4()
    course_id = uuid4()
    course = make_course(course_id, owner=user_id)
    db = make_mock_database()
    db.courses.get_course = AsyncMock(return_value=make_course(course_id))
    db.courses.clone_course = AsyncMock(return_value=course)

    response = await courses.clone_course(course_id, db, make_user(user_id))

    assert response.id == str(course_id)


@pytest.mark.asyncio
async def test_create_course_maps_duplicate_error_to_conflict():
    user_id = uuid4()
    db = make_mock_database()
    db.courses.create_course = AsyncMock(side_effect=DuplicateError())

    with pytest.raises(HTTPException) as raised:
        await courses.create_course(make_create_request(), None, db, make_user(user_id))

    assert raised.value.status_code == 409


@pytest.mark.asyncio
async def test_create_course_hides_integrity_error_detail():
    user_id = uuid4()
    sql_error = "insert on courses.tees violates constraint courses_tees_course_id_fkey"
    db = make_mock_database()
    db.courses.create_course = AsyncMock(side_effect=IntegrityError(sql_error))

    with pytest.raises(HTTPException) as raised:
        await courses.create_course(make_create_request(), None, db, make_user(user_id))

    assert (raised.value.status_code, raised.value.detail) == (
        500,
        "We couldn't save this course. Please try again.",
    )
    assert sql_error not in raised.value.detail


@pytest.mark.asyncio
async def test_clone_course_maps_missing_course_to_not_found():
    user_id = uuid4()
    db = make_mock_database()
    db.courses.get_course = AsyncMock(return_value=make_course(uuid4()))
    db.courses.clone_course = AsyncMock(side_effect=NotFoundError())

    with pytest.raises(HTTPException) as raised:
        await courses.clone_course(uuid4(), db, make_user(user_id))

    assert raised.value.status_code == 404


@pytest.mark.asyncio
async def test_course_listing_lookup_and_authorization():
    user_id = uuid4()
    course_id = uuid4()
    user = profile_user(user_id)
    course = pebble_beach(course_id)
    db = make_mock_database()
    other_id = uuid4()
    db.courses.list_course_summaries = AsyncMock(
        return_value=[pebble_beach_summary(course_id), pebble_beach_summary(other_id)]
    )
    db.courses.get_course = AsyncMock(return_value=course)
    played = [
        Round(id=str(uuid4()), course=course, date=datetime(2026, 1, day, tzinfo=timezone.utc),
              hole_scores=[HoleScore(hole_number=n, strokes=4 + (n <= over), par_played=4) for n in range(1, 19)])
        for day, over in ((9, 10), (2, 6))
    ]
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=played)

    listed = await courses.list_courses(20, 0, user_id, db, user)
    assert listed[0].model_dump() == {
        "id": str(course_id),
        "name": "Pebble Beach",
        "external_course_id": None,
        "source": "local",
        "location": "Monterey",
        "par": 72,
        "total_holes": 1,
        "tee_count": 2,
        "tees": ["Blue", "White"],
        "rounds_played": 2,
        "scoring_average": 80.0,
        "best_score": 78,
    }
    assert db.rounds.get_round_summaries_for_user.await_args.kwargs == {
        "limit": None, "course_ids": [str(course_id), str(other_id)],
    }
    assert (listed[1].rounds_played, listed[1].scoring_average, listed[1].best_score) == (0, None, None)
    assert db.courses.list_course_summaries.await_args.kwargs == {
        "limit": 20, "offset": 0, "user_id": str(user_id),
    }
    fetched = await courses.get_course(course_id, db, None)
    assert fetched.id == course.id
    assert fetched.name == "Pebble Beach"

    with pytest.raises(HTTPException) as exc:
        await courses.list_courses(20, 0, user_id, db, None)
    assert exc.value.status_code == 403

    db.courses.get_course.return_value = None
    with pytest.raises(HTTPException) as exc:
        await courses.get_course(course_id, db, user)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_course_search_merges_external_results(monkeypatch):
    user_id = uuid4()
    db = make_mock_database()
    db.courses.search_course_summaries = AsyncMock(return_value=[pebble_beach_summary(uuid4())])
    external_service = MagicMock()
    external_service.search_external_courses = AsyncMock(return_value=[
        {"external_course_id": "ext-1", "name": "Pebble Beach", "city": "Monterey"},
        {"external_course_id": "ext-2", "name": "Spyglass Hill", "city": "Pebble Beach", "state": "CA"},
        {"name": "Missing ID"},
    ])
    monkeypatch.setattr(courses, "GolfCourseAPIService", lambda: external_service)

    search_results = await courses.search_courses("Pebble", user_id, True, False, db, profile_user(user_id))
    assert db.courses.search_course_summaries.await_args.kwargs == {"user_id": str(user_id)}
    assert search_results[0].source == "local"
    assert search_results[0].external_course_id == "ext-1"
    assert search_results[1].name == "Spyglass Hill"
    assert search_results[1].source == "external"
    assert search_results[0].rounds_played == 0

    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[])
    await courses.search_courses("Pebble", user_id, False, True, db, profile_user(user_id))
    assert db.rounds.get_round_summaries_for_user.await_count == 1

    with pytest.raises(HTTPException) as exc:
        await courses.search_courses("Pebble", None, True, False, db, None)
    assert exc.value.status_code == 401
    with pytest.raises(HTTPException) as exc:
        await courses.search_courses("x --", None, False, False, db, None)
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_course_create_update_clone_and_error_mapping():
    user_id = uuid4()
    course_id = uuid4()
    user = profile_user(user_id)
    db = make_mock_database()
    created_course = pebble_beach(course_id, owner=user_id)
    db.courses.create_course = AsyncMock(return_value=created_course)

    request = courses.CreateCourseRequest(
        name=" pebble BEACH ",
        location="Monterey",
        holes=[{"number": 1, "par": 4, "handicap": 1}],
        tees=[{"color": "Blue", "hole_yardages": {1: 400}}],
    )
    create_response = await courses.create_course(request, None, db, user)
    assert create_response.id == str(course_id)
    assert db.courses.create_course.await_args.kwargs["user_id"] == str(user_id)

    db.courses.get_course = AsyncMock(return_value=created_course)
    db.courses.update_course = AsyncMock(return_value=created_course)
    update_response = await courses.update_course(course_id, courses.UpdateCourseRequest(name="new NAME"), db, user)
    assert update_response.name == "Pebble Beach"
    assert db.courses.update_course.await_args.kwargs["name"] == "New Name"

    db.courses.clone_course = AsyncMock(return_value=created_course)
    assert (await courses.clone_course(course_id, db, user)).id == str(course_id)

    db.courses.create_course.side_effect = DuplicateError()
    with pytest.raises(HTTPException) as exc:
        await courses.create_course(request, None, db, user)
    assert exc.value.status_code == 409

    sql_error = "insert on courses.tees violates constraint courses_tees_course_id_fkey"
    db.courses.create_course.side_effect = IntegrityError(sql_error)
    with pytest.raises(HTTPException) as exc:
        await courses.create_course(request, None, db, user)
    assert exc.value.status_code == 500
    assert exc.value.detail == "We couldn't save this course. Please try again."
    assert sql_error not in exc.value.detail

    db.courses.clone_course.side_effect = NotFoundError()
    with pytest.raises(HTTPException) as exc:
        await courses.clone_course(course_id, db, user)
    assert exc.value.status_code == 404
