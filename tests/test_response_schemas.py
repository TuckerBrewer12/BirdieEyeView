"""Resource response schemas freeze the JSON the endpoints returned as raw domain models."""

from datetime import datetime

import pytest

from api.routers import courses, rounds, users
from api.schemas import CourseResponse, RoundResponse, UserResponse, UserTeeResponse
from models import Course, Hole, HoleScore, Round, Tee, User, UserTee
from models.hole_layout import FRONT_NINE
from models.tee import TeeRating

YARDS = {n: 300 + n for n in FRONT_NINE}


def full_course() -> Course:
    return Course(
        id="course-1",
        name="Pebble Beach",
        external_course_id="ext-1",
        location="Monterey, CA",
        total_holes=9,
        holes=[Hole(number=n, par=4, handicap=n) for n in FRONT_NINE],
        tees=[
            Tee(
                color="Blue",
                hole_yardages=YARDS,
                yardage_holes=FRONT_NINE,
                course_rating=35.5,
                slope_rating=120,
                rating_holes=FRONT_NINE,
                ratings=[TeeRating(hole_numbers=FRONT_NINE, course_rating=35.5, slope_rating=120)],
            )
        ],
        user_id="user-1",
    )


def full_user_tee() -> UserTee:
    return UserTee(
        id="tee-1",
        user_id="user-1",
        course_id="course-1",
        name="Blue",
        course_rating=35.5,
        slope_rating=120,
        hole_yardages=YARDS,
        created_at=datetime(2026, 11, 1, 9, 30),
    )


def full_round() -> Round:
    return Round(
        id="round-1",
        course=full_course(),
        tee_box="Blue",
        date=datetime(2026, 11, 2, 8, 0),
        hole_scores=[
            HoleScore(
                hole_number=n, strokes=5, putts=2, shots_to_green=3, net_score=4, played=True,
                fairway_hit=True, green_in_regulation=False, par_played=4, handicap_played=n,
            )
            for n in FRONT_NINE
        ],
        intended_holes=FRONT_NINE,
        weather_conditions="Windy",
        notes="Reviewed",
        course_name_played="Pebble Beach",
        user_tee=full_user_tee(),
    )


def full_user() -> User:
    return User(
        id="user-1",
        friend_code="ABCD-1234",
        name="Tucker",
        email="tucker@example.com",
        email_verified=True,
        email_verified_at=datetime(2026, 1, 1),
        home_course_id="course-1",
        handicap=12.4,
        rounds=[full_round()],
        created_at=datetime(2025, 6, 1),
        last_handicap_update=datetime(2026, 10, 1),
        scoring_goal=89,
        scoring_goal_nine=44,
    )


@pytest.mark.parametrize(
    ("domain", "schema"),
    [
        (full_course(), CourseResponse),
        (full_round(), RoundResponse),
        (full_user(), UserResponse),
        (full_user_tee(), UserTeeResponse),
    ],
    ids=["course", "round", "user", "user-tee"],
)
def test_response_schema_returns_the_domain_json_unchanged(domain, schema):
    # FastAPI validates the returned domain object itself into the response model.
    frozen = schema.model_validate(domain).model_dump(mode="json")

    assert frozen == domain.model_dump(mode="json")


def test_course_detail_http_response_is_unchanged():
    from types import SimpleNamespace
    from unittest.mock import AsyncMock
    from uuid import uuid4

    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from api.dependencies import get_db, get_optional_current_user

    course = full_course().model_copy(update={"user_id": None})  # a master course, readable by anyone
    app = FastAPI()
    app.include_router(courses.router, prefix="/api/courses")
    app.dependency_overrides[get_db] = lambda: SimpleNamespace(
        courses=SimpleNamespace(get_course=AsyncMock(return_value=course))
    )
    app.dependency_overrides[get_optional_current_user] = lambda: None

    response = TestClient(app).get(f"/api/courses/{uuid4()}")

    assert response.status_code == 200
    assert response.json() == course.model_dump(mode="json")
