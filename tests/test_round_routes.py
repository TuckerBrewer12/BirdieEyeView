from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from api.routers import rounds
from models import UserTee
from tests.helpers import make_course, make_mock_database, make_round, make_round_summary, make_user


def test_update_round_request_rejects_duplicate_holes():
    with pytest.raises(ValidationError):
        rounds.UpdateRoundRequest(hole_scores=[{"hole_number": 1}, {"hole_number": 1}])


def test_hole_score_update_rejects_putts_above_strokes():
    with pytest.raises(ValidationError):
        rounds.HoleScoreUpdate(hole_number=1, strokes=2, putts=3)


def test_summarize_round_calculates_scoring_totals():
    summary = rounds.summarize_round(make_round(uuid4()))

    assert (summary.total_score, summary.to_par) == (9, 1)


def test_summarize_round_uses_played_course_and_fairways():
    summary = rounds.summarize_round(make_round(uuid4()))

    assert (summary.course_name, summary.fairways_hit) == ("Played Course", 1)


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
async def test_list_rounds_returns_summaries():
    user_id = uuid4()
    round_id = uuid4()
    db = make_mock_database()
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[make_round_summary(round_id)])

    listed = await rounds.get_rounds_for_user(user_id, 10, 0, db, make_user(user_id))

    assert (listed[0].id, listed[0].to_par) == (str(round_id), 8)


@pytest.mark.asyncio
async def test_get_round_returns_owned_round(owned_round_setup):
    user_id, round_id, stored_round, db = owned_round_setup

    result = await rounds.get_round(round_id, db, make_user(user_id))

    assert result == stored_round


@pytest.mark.asyncio
async def test_get_round_returns_not_found_for_missing_owner(owned_round_setup):
    user_id, round_id, _, db = owned_round_setup
    db.rounds.get_round_owner_id.return_value = None

    with pytest.raises(HTTPException) as raised:
        await rounds.get_round(round_id, db, make_user(user_id))

    assert raised.value.status_code == 404


@pytest.mark.asyncio
async def test_update_round_updates_scores_and_metadata(owned_round_setup):
    user_id, round_id, stored_round, db = owned_round_setup
    db.rounds.update_hole_scores = AsyncMock(return_value=stored_round)
    db.rounds.update_round = AsyncMock(return_value=stored_round)
    request = rounds.UpdateRoundRequest(
        hole_scores=[{"hole_number": 1, "strokes": 4, "putts": 2, "par_played": 4}],
        notes="Updated",
        weather_conditions="Windy",
        tee_box="White",
        course_name_played="New Course",
    )

    result = await rounds.update_round(round_id, request, db, make_user(user_id))

    assert result == stored_round
    db.rounds.update_hole_scores.assert_awaited_once()
    assert db.rounds.update_round.await_args.kwargs["tee_box_played"] == "White"


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
