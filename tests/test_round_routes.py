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
from tests.helpers import make_course, make_http_request, make_mock_database, make_round, make_round_summary, make_user
from tests.route_fixtures import (
    friendship_row,
    listed_round,
    pebble_beach,
    pebble_beach_summary,
    played_round,
    profile_user,
)


def test_update_round_request_rejects_duplicate_holes():
    with pytest.raises(ValidationError):
        rounds.UpdateRoundRequest(hole_scores=[{"hole_number": 1}, {"hole_number": 1}])


def test_hole_score_update_rejects_putts_above_strokes():
    with pytest.raises(ValidationError):
        rounds.HoleScoreUpdate(hole_number=1, strokes=2, putts=3)


@pytest.fixture
def owned_round_setup():
    user_id = uuid4()
    round_id = uuid4()
    stored_round = make_round(round_id)
    db = make_mock_database()
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.get_round = AsyncMock(return_value=stored_round)
    return user_id, round_id, stored_round, db


@pytest.mark.asyncio
async def test_get_round_returns_not_found_for_missing_owner(owned_round_setup):
    user_id, round_id, _, db = owned_round_setup
    db.rounds.get_round_owner_id.return_value = None

    with pytest.raises(HTTPException) as raised:
        await rounds.get_round(round_id, db, make_user(user_id))

    assert raised.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_round_delegates_with_owner(owned_round_setup):
    user_id, round_id, _, db = owned_round_setup
    db.rounds.delete_round = AsyncMock(return_value=True)

    await rounds.delete_round(round_id, db, make_user(user_id))

    db.rounds.delete_round.assert_awaited_once_with(str(round_id), user_id=str(user_id))


@pytest.mark.asyncio
async def test_link_course_backfills_scan_data():
    user_id = uuid4()
    round_id = uuid4()
    course_id = uuid4()
    course = make_course(course_id, owner=user_id)
    stored_round = make_round(round_id)
    stored_round.user_tee = UserTee(
        user_id=str(user_id),
        name="Blue",
        slope_rating=120,
        course_rating=70,
        hole_yardages={1: 400},
    )
    db = make_mock_database()
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.get_round = AsyncMock(return_value=stored_round)
    db.rounds.link_course_to_round = AsyncMock(return_value=stored_round)
    db.courses.get_course = AsyncMock(return_value=course)
    db.courses.fill_course_gaps = AsyncMock()

    linked_round = await rounds.link_course_to_round(
        round_id,
        rounds.LinkCourseRequest(course_id=course_id),
        db,
        make_user(user_id),
    )

    assert linked_round.id == str(round_id)
    assert db.courses.fill_course_gaps.await_count == 2
    db.rounds.link_course_to_round.assert_awaited_once()


def test_round_request_validation_and_summary():
    with pytest.raises(ValidationError):
        rounds.UpdateRoundRequest(hole_scores=[{"hole_number": 1}, {"hole_number": 1}])
    with pytest.raises(ValidationError):
        rounds.HoleScoreUpdate(hole_number=1, strokes=2, putts=3)

    summary = round_summary(played_round(uuid4()))
    assert summary.total_score == 9
    assert summary.to_par == 1
    assert summary.total_putts == 4
    assert summary.course_name == "Played Course"
    assert summary.front_nine is None
    assert (summary.score_counts.bogey, summary.score_counts.par, summary.score_counts.birdie) == (1, 1, 0)
    assert [h.model_dump() for h in summary.hole_scores] == [
        {"hole_number": 1, "strokes": 5, "kind": "bogey", "running_to_par": 1},
        {"hole_number": 2, "strokes": 4, "kind": "par", "running_to_par": 1},
    ]


@pytest.mark.asyncio
async def test_round_listing_get_update_and_delete():
    user_id = uuid4()
    round_id = uuid4()
    user = profile_user(user_id)
    stored_round = played_round(round_id)
    db = make_mock_database()
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[listed_round(round_id)])
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.get_round = AsyncMock(return_value=stored_round)
    db.rounds.update_hole_scores = AsyncMock(return_value=stored_round)
    db.rounds.update_round = AsyncMock(return_value=stored_round)
    db.rounds.delete_round = AsyncMock(return_value=True)
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[])

    listed = await rounds.get_rounds_for_user(user_id, 10, 0, db, user)
    assert listed[0].to_par == 8
    assert (listed[0].front_nine, listed[0].back_nine) == (44, 36)
    assert len(listed[0].hole_scores) == 18
    fetched = await rounds.get_round(round_id, db, user)
    assert fetched.id == str(round_id)
    assert fetched.total_score == 9
    assert [h.kind for h in fetched.hole_scores] == ["bogey", "par"]

    update_request = rounds.UpdateRoundRequest(
        hole_scores=[{"hole_number": 1, "strokes": 4, "putts": 2, "par_played": 4}],
        notes="Updated",
        weather_conditions="Windy",
        tee_box="White",
        course_name_played="New Course",
    )
    updated = await rounds.update_round(round_id, update_request, db, user)
    assert updated.id == str(round_id)
    assert updated.to_par == 1
    db.rounds.update_hole_scores.assert_awaited_once()
    assert db.rounds.update_round.await_args.kwargs["tee_box_played"] == "White"

    await rounds.delete_round(round_id, db, user)
    db.rounds.delete_round.assert_awaited_once_with(str(round_id), user_id=str(user_id))

    db.rounds.get_round_owner_id.return_value = None
    with pytest.raises(HTTPException) as exc:
        await rounds.get_round(round_id, db, user)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_update_round_reports_a_missing_round_as_404_not_500():
    user_id = uuid4()
    round_id = uuid4()
    user = profile_user(user_id)
    db = make_mock_database()
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.update_hole_scores = AsyncMock(return_value=None)
    db.rounds.get_round = AsyncMock(return_value=None)

    with_scores = rounds.UpdateRoundRequest(hole_scores=[{"hole_number": 1, "strokes": 4}])
    with pytest.raises(HTTPException) as exc:
        await rounds.update_round(round_id, with_scores, db, user)
    assert (exc.value.status_code, exc.value.detail) == (404, "Round not found")

    with pytest.raises(HTTPException) as exc:
        await rounds.update_round(round_id, rounds.UpdateRoundRequest(notes="Windy"), db, user)
    assert exc.value.status_code == 404

    db.rounds.update_round = AsyncMock(side_effect=RuntimeError("connection lost"))
    db.rounds.get_round = AsyncMock(return_value=played_round(round_id))
    with pytest.raises(HTTPException) as exc:
        await rounds.update_round(round_id, rounds.UpdateRoundRequest(notes="Windy"), db, user)
    assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_link_round_to_owned_course_backfills_scan_data():
    user_id = uuid4()
    round_id = uuid4()
    course_id = uuid4()
    user = profile_user(user_id)
    course = pebble_beach(course_id, owner=user_id)
    stored_round = played_round(round_id)
    stored_round.user_tee = UserTee(
        user_id=str(user_id),
        name="Blue",
        slope_rating=120,
        course_rating=70,
        hole_yardages={1: 400},
    )
    db = make_mock_database()
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.get_round = AsyncMock(return_value=stored_round)
    db.rounds.link_course_to_round = AsyncMock(return_value=stored_round)
    db.courses.get_course = AsyncMock(return_value=course)
    db.courses.fill_course_gaps = AsyncMock()

    linked_round = await rounds.link_course_to_round(
        round_id,
        rounds.LinkCourseRequest(course_id=course_id),
        db,
        user,
    )
    assert linked_round.id == str(round_id)
    assert db.courses.fill_course_gaps.await_count == 2
    db.rounds.link_course_to_round.assert_awaited_once()
