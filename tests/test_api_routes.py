from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from api.routers import ai_insights, courses, rounds, stats, users
from database.exceptions import DuplicateError, IntegrityError, NotFoundError
from models import Course, Hole, HoleScore, Round, User, UserTee
from tests.helpers import make_http_request, make_mock_database


def _make_user(user_id: UUID, **overrides) -> User:
    return User(id=str(user_id), name="Golfer", email="golfer@example.com", **overrides)


def _make_course(course_id: UUID, *, owner: UUID | None = None) -> Course:
    return Course(
        id=str(course_id),
        name="Pebble Beach",
        location="Monterey",
        par=72,
        user_id=str(owner) if owner else None,
        holes=[Hole(number=1, par=4, handicap=1)],
    )


def _make_round(round_id: UUID, course: Course | None = None) -> Round:
    return Round(
        id=str(round_id),
        course=course,
        course_name_played="Played Course" if course is None else None,
        tee_box="Blue",
        date=datetime(2026, 1, 2),
        hole_scores=[
            HoleScore(hole_number=1, strokes=5, putts=2, par_played=4, fairway_hit=True),
            HoleScore(hole_number=2, strokes=4, putts=2, par_played=4, fairway_hit=False),
        ],
        notes="Good round",
    )


def _make_round_summary(round_id: UUID) -> dict:
    return {
        "id": round_id,
        "course_id": None,
        "course_name": "Pebble Beach",
        "course_location": "Monterey",
        "course_par": 72,
        "tee_box": "Blue",
        "round_date": datetime(2026, 1, 2),
        "total_score": 80,
        "front_nine": 40,
        "back_nine": 40,
        "total_putts": 30,
        "total_gir": 9,
        "fairways_hit": 8,
        "notes": None,
        "hole_scores_summary": [{"hole_number": 1, "strokes": 4}],
    }


def _make_friendship_row(requester: UUID, addressee: UUID) -> dict:
    now = datetime(2026, 1, 1)
    return {
        "id": uuid4(),
        "requester_id": requester,
        "addressee_id": addressee,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "requester_name": "One",
        "addressee_name": "Two",
    }


@pytest.mark.asyncio
async def test_course_listing_lookup_and_authorization():
    user_id = uuid4()
    course_id = uuid4()
    user = _make_user(user_id)
    course = _make_course(course_id)
    db = make_mock_database()
    db.courses.list_courses = AsyncMock(return_value=[course])
    db.courses.get_course = AsyncMock(return_value=course)

    listed = await courses.list_courses(20, 0, user_id, db, user)
    assert listed[0].name == "Pebble Beach"
    assert listed[0].total_holes == 1
    assert await courses.get_course(course_id, db, None) == course

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
    local_course = _make_course(uuid4())
    db = make_mock_database()
    db.courses.search_courses = AsyncMock(return_value=[local_course])
    external_service = MagicMock()
    external_service.search_external_courses = AsyncMock(return_value=[
        {"external_course_id": "ext-1", "name": "Pebble Beach", "city": "Monterey"},
        {"external_course_id": "ext-2", "name": "Spyglass Hill", "city": "Pebble Beach", "state": "CA"},
        {"name": "Missing ID"},
    ])
    monkeypatch.setattr(courses, "GolfCourseAPIService", lambda: external_service)

    search_results = await courses.search_courses("Pebble", user_id, True, db, _make_user(user_id))
    assert search_results[0].external_course_id == "ext-1"
    assert search_results[1].name == "Spyglass Hill"
    assert search_results[1].source == "external"

    with pytest.raises(HTTPException) as exc:
        await courses.search_courses("Pebble", None, True, db, None)
    assert exc.value.status_code == 401
    with pytest.raises(HTTPException) as exc:
        await courses.search_courses("x --", None, False, db, None)
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_course_create_update_clone_and_error_mapping():
    user_id = uuid4()
    course_id = uuid4()
    user = _make_user(user_id)
    db = make_mock_database()
    created_course = _make_course(course_id, owner=user_id)
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


def test_round_request_validation_and_summary():
    with pytest.raises(ValidationError):
        rounds.UpdateRoundRequest(hole_scores=[{"hole_number": 1}, {"hole_number": 1}])
    with pytest.raises(ValidationError):
        rounds.HoleScoreUpdate(hole_number=1, strokes=2, putts=3)

    round_summary = rounds.summarize_round(_make_round(uuid4()))
    assert round_summary.total_score == 9
    assert round_summary.to_par == 1
    assert round_summary.fairways_hit == 1
    assert round_summary.course_name == "Played Course"


@pytest.mark.asyncio
async def test_round_listing_get_update_and_delete():
    user_id = uuid4()
    round_id = uuid4()
    user = _make_user(user_id)
    stored_round = _make_round(round_id)
    db = make_mock_database()
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[_make_round_summary(round_id)])
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.get_round = AsyncMock(return_value=stored_round)
    db.rounds.update_hole_scores = AsyncMock(return_value=stored_round)
    db.rounds.update_round = AsyncMock(return_value=stored_round)
    db.rounds.delete_round = AsyncMock(return_value=True)

    listed = await rounds.get_rounds_for_user(user_id, 10, 0, db, user)
    assert listed[0].to_par == 8
    assert await rounds.get_round(round_id, db, user) == stored_round

    update_request = rounds.UpdateRoundRequest(
        hole_scores=[{"hole_number": 1, "strokes": 4, "putts": 2, "par_played": 4}],
        notes="Updated",
        weather_conditions="Windy",
        tee_box="White",
        course_name_played="New Course",
    )
    assert await rounds.update_round(round_id, update_request, db, user) == stored_round
    db.rounds.update_hole_scores.assert_awaited_once()
    assert db.rounds.update_round.await_args.kwargs["tee_box_played"] == "White"

    await rounds.delete_round(round_id, db, user)
    db.rounds.delete_round.assert_awaited_once_with(str(round_id), user_id=str(user_id))

    db.rounds.get_round_owner_id.return_value = None
    with pytest.raises(HTTPException) as exc:
        await rounds.get_round(round_id, db, user)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_link_round_to_owned_course_backfills_scan_data():
    user_id = uuid4()
    round_id = uuid4()
    course_id = uuid4()
    user = _make_user(user_id)
    course = _make_course(course_id, owner=user_id)
    stored_round = _make_round(round_id)
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


def test_user_request_validation():
    assert users.CreateUserTeeRequest(name="Blue", hole_yardages={"1": 400}).hole_yardages == {1: 400}
    assert users.UpdateUserRequest(handicap="+3").handicap == -3
    assert users.SendFriendRequest(addressee_friend_code=" ab-12 ").addressee_friend_code == "AB-12"
    with pytest.raises(ValidationError):
        users.SendFriendRequest()
    with pytest.raises(ValidationError):
        users.SendFriendRequest(addressee_user_id=uuid4(), addressee_friend_code="ABCD")
    with pytest.raises(ValidationError):
        users.CreateUserTeeRequest(name="Blue", hole_yardages={"bad": 400})


@pytest.mark.asyncio
async def test_user_get_update_and_handicap(monkeypatch):
    user_id = uuid4()
    course_id = uuid4()
    user = _make_user(user_id, handicap=12.0)
    db = make_mock_database()
    db.users.get_user_by_email = AsyncMock(return_value=user)
    db.users.get_user = AsyncMock(return_value=user)
    db.users.update_user = AsyncMock(return_value=user)
    db.courses.get_course = AsyncMock(return_value=_make_course(course_id))
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[])
    monkeypatch.setattr(users.hcap, "handicap_index", lambda *args, **kwargs: 12.0)

    assert await users.get_user_by_email("GOLFER@example.com", db, user) == user
    assert await users.get_user(user_id, db, user) == user
    request = users.UpdateUserRequest(home_course_id=course_id, handicap="+2", scoring_goal=85)
    assert await users.update_user(user_id, request, db, user) == user
    assert db.users.update_user.await_args.kwargs == {
        "home_course_id": str(course_id),
        "handicap_index": -2.0,
        "scoring_goal": 85,
    }
    assert await users.get_user_handicap(user_id, db, user) == {"handicap_index": 12.0}

    with pytest.raises(HTTPException) as exc:
        await users.get_user(uuid4(), db, user)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_user_tee_crud_and_friendship_flows():
    user_id = uuid4()
    other_id = uuid4()
    tee_id = uuid4()
    user = _make_user(user_id)
    user_tee = UserTee(id=str(tee_id), user_id=str(user_id), name="Blue")
    friendship_record = _make_friendship_row(user_id, other_id)
    db = make_mock_database()
    db.user_tees.get_user_tees = AsyncMock(return_value=[user_tee])
    db.user_tees.create_user_tee = AsyncMock(return_value=user_tee)
    db.user_tees.update_user_tee = AsyncMock(return_value=user_tee)
    db.user_tees.delete_user_tee = AsyncMock(return_value=True)
    db.users.get_user_by_friend_code = AsyncMock(return_value=_make_user(other_id))
    db.friendships.send_request = AsyncMock(return_value=friendship_record)
    db.friendships.update_status = AsyncMock(return_value=friendship_record)
    db.friendships.list_for_user = AsyncMock(return_value=[friendship_record])

    assert await users.get_user_tees(user_id, None, db, user) == [user_tee]
    created_tee = await users.create_user_tee(
        user_id,
        users.CreateUserTeeRequest(name="Blue", hole_yardages={"1": 400}),
        db,
        user,
    )
    assert created_tee == user_tee
    assert await users.update_user_tee(
        user_id, tee_id, users.UpdateUserTeeRequest(name="White"), db, user
    ) == user_tee
    await users.delete_user_tee(user_id, tee_id, db, user)

    friend_request_response = await users.send_friend_request(
        users.SendFriendRequest(addressee_friend_code="ABCD"), db, user
    )
    assert friend_request_response.model_dump() == {
        "id": str(friendship_record["id"]),
        "requester_id": str(user_id),
        "addressee_id": str(other_id),
        "status": "pending",
        "created_at": friendship_record["created_at"].isoformat(),
        "updated_at": friendship_record["updated_at"].isoformat(),
        "requester_name": "One",
        "requester_email": None,
        "addressee_name": "Two",
        "addressee_email": None,
    }
    db.users.get_user_by_friend_code.assert_awaited_once_with("ABCD")
    db.friendships.send_request.assert_awaited_once_with(str(user_id), str(other_id))

    accepted_friendship = {**friendship_record, "status": "accepted"}
    db.friendships.update_status.return_value = accepted_friendship
    db.friendships.list_for_user.return_value = [accepted_friendship]
    friendship_status_response = await users.update_friendship_status(
        UUID(str(friendship_record["id"])), users.FriendshipStatusRequest(status="accepted"), db, user
    )
    assert friendship_status_response.status == "accepted"
    assert friendship_status_response.id == str(friendship_record["id"])
    db.friendships.update_status.assert_awaited_once_with(
        str(friendship_record["id"]), str(user_id), "accepted"
    )

    friendship_responses = await users.list_friendships(None, db, user)
    assert [response.model_dump() for response in friendship_responses] == [
        friendship_status_response.model_dump()
    ]
    assert db.friendships.list_for_user.await_args.args == (str(user_id),)
    assert db.friendships.list_for_user.await_args.kwargs == {"status": None}

    db.user_tees.create_user_tee.side_effect = DuplicateError()
    with pytest.raises(HTTPException) as exc:
        await users.create_user_tee(user_id, users.CreateUserTeeRequest(name="Blue"), db, user)
    assert exc.value.status_code == 409
    db.user_tees.update_user_tee.side_effect = NotFoundError()
    with pytest.raises(HTTPException) as exc:
        await users.update_user_tee(user_id, tee_id, users.UpdateUserTeeRequest(name="Blue"), db, user)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_dashboard_and_empty_analytics(monkeypatch):
    user_id = uuid4()
    round_id = uuid4()
    user = _make_user(user_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[_make_round_summary(round_id)])
    db.rounds.get_rounds_for_user = AsyncMock(side_effect=[[], [], []])
    monkeypatch.setattr(stats.hcap, "handicap_index", lambda rounds: 10.0)

    dashboard = await stats.get_dashboard(user_id, db, user)
    assert dashboard.total_rounds == 1
    assert dashboard.scoring_average == 80.0
    assert dashboard.best_round_id == str(round_id)

    db.rounds.get_rounds_for_user = AsyncMock(side_effect=[[], []])
    analytics = await stats.get_analytics(user_id, 50, None, None, db, user)
    assert analytics["kpis"]["total_rounds"] == 0
    assert analytics["notable_achievements"]["round_milestones"]["lifetime"]["first_eagle"] is None


@pytest.mark.asyncio
async def test_stats_auxiliary_endpoints(monkeypatch):
    user_id = uuid4()
    course_id = uuid4()
    round_id = uuid4()
    user = _make_user(user_id, scoring_goal=85, home_course_id=str(course_id))
    stored_round = _make_round(round_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_played_courses_for_user = AsyncMock(return_value=[{"id": str(course_id)}])
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[stored_round])

    assert await stats.get_played_courses(user_id, db, user) == [{"id": str(course_id)}]
    monkeypatch.setattr("analytics.goals.goal_report", lambda rounds, scoring_goal, home: {"gap": 5})
    assert (await stats.get_goal_report(user_id, 50, db, user))["gap"] == 5

    round_comparison = await stats.get_round_comparison(user_id, round_id, db, user)
    assert set(round_comparison) == {"score", "putts", "gir", "three_putts", "putts_per_gir", "scrambling"}

    db.rounds.get_rounds_for_user.return_value = []
    assert await stats.get_milestones(user_id, 12, db, user) == {"milestones": []}

    course_analytics = await stats.get_course_analytics(user_id, course_id, db, user)
    assert course_analytics["rounds_played"] == 0
    assert course_analytics["course_id"] == str(course_id)


@pytest.mark.asyncio
async def test_ai_insights_success_and_rate_limits(monkeypatch):
    user_id = uuid4()
    user = _make_user(user_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    ai_service = MagicMock()
    ai_service.generate_suggestions = AsyncMock(return_value={"ok": True})
    monkeypatch.setattr(ai_insights, "AIService", lambda db: ai_service)

    ai_rate_limiter = MagicMock()
    ai_rate_limiter.check.side_effect = [(True, 0), (True, 0)]
    monkeypatch.setattr(ai_insights, "ai_rate_limiter", ai_rate_limiter)
    assert await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, 5.0, db, user) == {"ok": True}

    ai_rate_limiter.check.side_effect = [(False, 9)]
    with pytest.raises(HTTPException) as exc:
        await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, None, db, user)
    assert exc.value.status_code == 429

    ai_rate_limiter.check.side_effect = [(True, 0), (False, 7)]
    with pytest.raises(HTTPException) as exc:
        await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, None, db, user)
    assert exc.value.headers["Retry-After"] == "7"
