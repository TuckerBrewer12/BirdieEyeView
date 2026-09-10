from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from api.routers import courses
from database.exceptions import DuplicateError, IntegrityError, NotFoundError
from tests.helpers import make_course, make_mock_database, make_user


@pytest.mark.asyncio
async def test_list_courses_returns_summaries():
    user_id = uuid4()
    course = make_course(uuid4())
    db = make_mock_database()
    db.courses.list_courses = AsyncMock(return_value=[course])

    listed = await courses.list_courses(20, 0, user_id, db, make_user(user_id))

    assert (listed[0].name, listed[0].total_holes) == ("Pebble Beach", 1)


@pytest.mark.asyncio
async def test_list_courses_requires_user_for_private_filter():
    with pytest.raises(HTTPException) as raised:
        await courses.list_courses(20, 0, uuid4(), make_mock_database(), None)

    assert raised.value.status_code == 403


@pytest.mark.asyncio
async def test_get_course_returns_repository_course():
    course_id = uuid4()
    course = make_course(course_id)
    db = make_mock_database()
    db.courses.get_course = AsyncMock(return_value=course)

    assert await courses.get_course(course_id, db, None) == course


@pytest.mark.asyncio
async def test_get_course_returns_not_found():
    db = make_mock_database()
    db.courses.get_course = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as raised:
        await courses.get_course(uuid4(), db, None)

    assert raised.value.status_code == 404


@pytest.mark.asyncio
async def test_course_search_merges_valid_external_results(monkeypatch):
    user_id = uuid4()
    db = make_mock_database()
    db.courses.search_courses = AsyncMock(return_value=[make_course(uuid4())])
    external_service = MagicMock()
    external_service.search_external_courses = AsyncMock(
        return_value=[
            {"external_course_id": "ext-1", "name": "Pebble Beach", "city": "Monterey"},
            {
                "external_course_id": "ext-2",
                "name": "Spyglass Hill",
                "city": "Pebble Beach",
                "state": "CA",
            },
            {"name": "Missing ID"},
        ]
    )
    monkeypatch.setattr(courses, "GolfCourseAPIService", lambda: external_service)

    results = await courses.search_courses("Pebble", user_id, True, db, make_user(user_id))

    assert [(result.external_course_id, result.name) for result in results] == [
        ("ext-1", "Pebble Beach"),
        ("ext-2", "Spyglass Hill"),
    ]
    assert results[1].source == "external"


@pytest.mark.asyncio
async def test_external_course_search_requires_authentication():
    with pytest.raises(HTTPException) as raised:
        await courses.search_courses("Pebble", None, True, make_mock_database(), None)

    assert raised.value.status_code == 401


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
