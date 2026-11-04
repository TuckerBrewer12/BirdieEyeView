"""API-domain contracts checked through real HTTP requests.

Route-function tests skip FastAPI's request validation and response serialization; these go
through both. Server errors come back as responses (not raised), so a 500 fails the assertion.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.dependencies import get_current_user, get_db, get_optional_current_user
from api.routers import courses, rounds, users
from database.exceptions import DuplicateError
from models import UserTee
from tests.helpers import make_course, make_mock_database, make_user
from tests.test_response_schemas import full_round, full_user, full_user_tee


@pytest.fixture
def api():
    user_id = uuid4()
    user = make_user(user_id)
    db = make_mock_database()
    db.user_tees.create_user_tee = AsyncMock()
    db.user_tees.update_user_tee = AsyncMock()
    db.courses.create_course = AsyncMock()
    db.users.update_user = AsyncMock()
    app = FastAPI()
    app.include_router(users.router, prefix="/api/users")
    app.include_router(courses.router, prefix="/api/courses")
    app.include_router(rounds.router, prefix="/api/rounds")
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_optional_current_user] = lambda: user
    return TestClient(app, raise_server_exceptions=False), db, user_id


# ================================================================
# Input checks reach the client as 422, never 500
# ================================================================


@pytest.mark.parametrize(
    "body",
    [
        {"name": "Blue", "course_rating": True},
        {"name": "Blue", "slope_rating": True},
        {"name": "Blue", "hole_yardages": {"9" * 400: 400}},
        {"name": "Blue", "hole_yardages": {"1": 10**400}},
        {"name": "Blue", "course_rating": 10**400},
        {"name": "Blue", "hole_yardages": {"01": 350, "1": 400}},
        {"name": "Blue", "hole_yardages": {"1": [400]}},
    ],
    ids=["bool-rating", "bool-slope", "huge-hole-key", "huge-yardage", "huge-rating", "same-hole-twice", "list-yardage"],
)
def test_user_tee_create_rejects_malformed_input(api, body):
    client, db, user_id = api

    response = client.post(f"/api/users/{user_id}/tees", json=body)

    assert response.status_code == 422
    db.user_tees.create_user_tee.assert_not_awaited()


def test_user_tee_update_rejects_boolean_rating(api):
    client, db, user_id = api

    response = client.put(f"/api/users/{user_id}/tees/{uuid4()}", json={"course_rating": True})

    assert response.status_code == 422
    db.user_tees.update_user_tee.assert_not_awaited()


NINE_HOLES = [{"number": n, "par": 4} for n in range(1, 10)]


# Each body is valid except for the one thing its id names, and the message proves which guard fired.
@pytest.mark.parametrize(
    ("body", "message"),
    [
        ({"name": "Pebble", "holes": [{"number": 1, "par": 4}]}, "holes 1-9 or 1-18"),
        ({"name": "Pebble", "holes": [{"number": True, "par": 4}] + NINE_HOLES[1:]}, "not true/false"),
        ({"name": "Pebble", "tees": [{"color": "Blue", "hole_yardages": {"19": 400}}]}, "between 1 and 18"),
        ({"name": "Pebble", "tees": [{"color": "Blue", "hole_yardages": {"1": -20}}]}, "between 0 and 1000"),
        ({"name": "Pebble", "tees": [{"color": "Blue"}, {"color": "blue"}]}, "different name"),
    ],
    ids=["partial-holes", "bool-hole-number", "hole-19-yardage", "negative-yardage", "repeated-tee-name"],
)
def test_course_create_rejects_invalid_course(api, body, message):
    client, db, _ = api

    response = client.post("/api/courses", json=body)

    assert response.status_code == 422
    assert message in str(response.json()["detail"])
    db.courses.create_course.assert_not_awaited()


def test_valid_nine_hole_course_is_created(api):
    client, db, _ = api
    db.courses.create_course = AsyncMock(side_effect=lambda course, user_id: course.model_copy(update={"id": "c1"}))

    assert client.post("/api/courses", json={"name": "Pebble", "holes": NINE_HOLES}).status_code == 201


def test_profile_update_persists_a_changed_goal(api):
    client, db, user_id = api
    stored = full_user()  # scoring_goal_nine is 44
    db.users.update_user = AsyncMock(side_effect=lambda uid, **fields: stored.model_copy(update=fields))

    response = client.patch(f"/api/users/{user_id}", json={"scoring_goal_nine": 43})

    assert response.status_code == 200
    assert db.users.update_user.await_args.kwargs == {"scoring_goal_nine": 43}
    assert response.json()["scoring_goal_nine"] == 43


@pytest.mark.parametrize("body", [{"scoring_goal": 17}, {"handicap": True}], ids=["goal-below-18", "bool-handicap"])
def test_profile_update_rejects_invalid_values_without_writing(api, body):
    client, db, user_id = api

    assert client.patch(f"/api/users/{user_id}", json=body).status_code == 422
    db.users.update_user.assert_not_awaited()


# ================================================================
# Errors and access
# ================================================================


def test_user_tee_cannot_link_another_users_private_course(api):
    client, db, user_id = api
    db.courses.get_course = AsyncMock(return_value=make_course(uuid4(), owner=uuid4()))

    response = client.post(f"/api/users/{user_id}/tees", json={"name": "Blue", "course_id": str(uuid4())})

    assert response.status_code == 403
    db.user_tees.create_user_tee.assert_not_awaited()


def test_empty_update_of_missing_user_tee_is_not_found(api):
    client, db, user_id = api
    db.user_tees.update_user_tee = AsyncMock(return_value=None)

    assert client.put(f"/api/users/{user_id}/tees/{uuid4()}", json={}).status_code == 404


def test_course_update_duplicate_is_conflict(api):
    client, db, user_id = api
    db.courses.get_course = AsyncMock(return_value=make_course(uuid4(), owner=user_id))
    db.courses.update_course = AsyncMock(side_effect=DuplicateError())

    assert client.put(f"/api/courses/{uuid4()}", json={"name": "Pebble"}).status_code == 409


def test_round_edit_of_missing_round_is_not_found(api):
    client, db, user_id = api
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.update_hole_scores = AsyncMock(return_value=None)

    response = client.put(f"/api/rounds/{uuid4()}", json={"hole_scores": [{"hole_number": 1, "strokes": 4}]})

    assert response.status_code == 404


# ================================================================
# Frozen response JSON
# ================================================================


def test_round_detail_json_is_unchanged(api):
    client, db, user_id = api
    round_ = full_round()
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.get_round = AsyncMock(return_value=round_)

    response = client.get(f"/api/rounds/{uuid4()}")

    assert response.status_code == 200
    assert response.json() == round_.model_dump(mode="json")


def test_user_profile_json_is_unchanged(api):
    client, db, user_id = api
    user = full_user().model_copy(update={"id": str(user_id)})
    db.users.get_user = AsyncMock(return_value=user)

    response = client.get(f"/api/users/{user_id}")

    assert response.status_code == 200
    assert response.json() == user.model_dump(mode="json")


def test_user_tee_list_json_is_unchanged(api):
    client, db, user_id = api
    tees = [full_user_tee(), UserTee(user_id=str(user_id), name="White")]
    db.user_tees.get_user_tees = AsyncMock(return_value=tees)

    response = client.get(f"/api/users/{user_id}/tees")

    assert response.status_code == 200
    assert response.json() == [tee.model_dump(mode="json") for tee in tees]
