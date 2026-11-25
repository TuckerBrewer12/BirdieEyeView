import asyncio
from datetime import date, timedelta
from typing import List, Literal, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from database.db_manager import DatabaseManager
from api.messages import (
    COURSE_ID_MUST_BE_A_VALID_UUID, FORBIDDEN, FRIEND_ID_IS_REQUIRED, NO_BENCHMARK_FOR_THAT_HANDICAP, NO_ROUNDS_FOUND,
    NO_SCORING_GOAL, ROUND_NOT_IN_HISTORY, USER_NOT_FOUND,
)
from api.dependencies import get_current_user, get_db, get_self
from api.input_validation import ensure_uuid_str
from models import User
from api.course_analytics_responses import course_analytics
from api.analytics_responses import analytics_response
from api.dashboard_responses import dashboard_response
from api.goal_responses import goal_report_response
from api.schemas import (
    AnalyticsResponse,
    BenchmarkComparisonResponse,
    CourseAnalyticsResponse,
    DashboardResponse,
    GoalReportResponse,
    PlayedCourseResponse,
    RoundComparisonResponse,
)
from analytics import benchmarks
from analytics import dashboard
from analytics import round_comparison
from analytics.goals import goal_report

router = APIRouter()

MAX_ANALYTICS_ROUNDS = 500


@router.get("/dashboard/{user_id}", response_model=DashboardResponse)
async def get_dashboard(
    user: User = Depends(get_self),
    db: DatabaseManager = Depends(get_db),
):
    summaries = await db.rounds.get_round_summaries_for_user(str(user.id), limit=None, offset=0)
    history = await db.rounds.get_rounds_for_user(str(user.id), limit=None, offset=0)
    return dashboard_response(user, summaries, history, dashboard.today())


@router.get("/analytics/{user_id}", response_model=AnalyticsResponse)
async def get_analytics(
    user_id: UUID,
    limit: int = Query(default=50, ge=1, le=MAX_ANALYTICS_ROUNDS),
    course_id: Optional[str] = Query(default=None),
    timeframe: Optional[Literal["ytd", "1y"]] = Query(default=None),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    viewer_id = str(current_user.id)
    target_user_id = str(user_id)
    can_view = viewer_id == target_user_id or await db.friendships.are_friends(viewer_id, target_user_id)
    if not can_view:
        raise HTTPException(403, FORBIDDEN)
    user = await db.users.get_user(target_user_id)
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)

    resolved_course_id: Optional[str] = None
    if course_id and course_id not in ("all", ""):
        if course_id == "home":
            resolved_course_id = str(user.home_course_id) if user.home_course_id else None
        else:
            try:
                resolved_course_id = ensure_uuid_str(course_id, "course_id")
            except ValueError:
                raise HTTPException(422, COURSE_ID_MUST_BE_A_VALID_UUID) from None

    date_from: Optional[date] = None
    today = dashboard.today()
    if timeframe == "ytd":
        date_from = date(today.year, 1, 1)
    elif timeframe == "1y":
        date_from = today - timedelta(days=365)

    def read_history():
        return db.rounds.get_rounds_for_user(target_user_id, limit=None, offset=0)

    if course_id == "home" and user.home_course_id is None:
        rounds_desc, history_desc = [], await read_history()
    elif resolved_course_id is None and date_from is None:
        history_desc = await read_history()
        rounds_desc = history_desc[:limit]
    else:
        rounds_desc, history_desc = await asyncio.gather(
            db.rounds.get_rounds_for_user(
                target_user_id, limit=limit, offset=0,
                course_id=resolved_course_id,
                date_from=date_from,
            ),
            read_history(),
        )

    return analytics_response(
        list(reversed(rounds_desc)),
        list(reversed(history_desc)),
        home_course_id=user.home_course_id,
        user=user,
    )


@router.get("/{user_id}/played-courses", response_model=List[PlayedCourseResponse])
async def get_played_courses(
    user: User = Depends(get_self),
    db: DatabaseManager = Depends(get_db),
):
    courses = await db.rounds.get_played_courses_for_user(str(user.id))
    return [PlayedCourseResponse(**course) for course in courses]


@router.get("/{user_id}/goal-report", response_model=GoalReportResponse)
async def get_goal_report(
    limit: int = Query(default=50, ge=1, le=MAX_ANALYTICS_ROUNDS),
    user: User = Depends(get_self),
    db: DatabaseManager = Depends(get_db),
):
    if user.scoring_goal is None and user.scoring_goal_nine is None:
        raise HTTPException(400, NO_SCORING_GOAL)

    rounds_desc = await db.rounds.get_rounds_for_user(str(user.id), limit=limit)
    rounds = list(reversed(rounds_desc))

    home_course_rounds = None
    if user.home_course_id:
        home_rounds_desc = await db.rounds.get_rounds_for_user(
            str(user.id), limit=None, course_id=str(user.home_course_id)
        )
        if home_rounds_desc:
            home_course_rounds = list(reversed(home_rounds_desc))

    report = goal_report(rounds, user.scoring_goal, home_course_rounds, scoring_goal_nine=user.scoring_goal_nine)
    return goal_report_response(report)


@router.get("/{user_id}/benchmark", response_model=BenchmarkComparisonResponse)
async def get_benchmark_comparison(
    against: Literal["handicap", "friend"],
    handicap: Optional[int] = Query(default=None),
    friend_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=MAX_ANALYTICS_ROUNDS),
    user: User = Depends(get_self),
    db: DatabaseManager = Depends(get_db),
):
    viewer_id = str(user.id)
    rounds = list(reversed(await db.rounds.get_rounds_for_user(viewer_id, limit=limit)))

    if against == "handicap":
        if handicap is None or benchmarks.handicap_benchmark(handicap) is None:
            raise HTTPException(422, NO_BENCHMARK_FOR_THAT_HANDICAP)
        return BenchmarkComparisonResponse.model_validate(benchmarks.handicap_comparison(rounds, handicap))
    if friend_id is None:
        raise HTTPException(422, FRIEND_ID_IS_REQUIRED)
    if not await db.friendships.are_friends(viewer_id, str(friend_id)):
        raise HTTPException(403, FORBIDDEN)
    friend_rounds = list(reversed(await db.rounds.get_rounds_for_user(str(friend_id), limit=limit)))
    return BenchmarkComparisonResponse.model_validate(benchmarks.friend_comparison(rounds, friend_rounds))


@router.get("/compare/{user_id}/{round_id}", response_model=RoundComparisonResponse)
async def get_round_comparison(
    round_id: UUID,
    user: User = Depends(get_self),
    db: DatabaseManager = Depends(get_db),
):
    rounds_desc = await db.rounds.get_rounds_for_user(str(user.id), limit=None, offset=0)
    rounds = list(reversed(rounds_desc))

    if not rounds:
        raise HTTPException(404, NO_ROUNDS_FOUND)

    round_index = next((i for i, r in enumerate(rounds) if str(r.id) == str(round_id)), None)
    if round_index is None:
        raise HTTPException(404, ROUND_NOT_IN_HISTORY)

    return RoundComparisonResponse.model_validate(round_comparison.round_vs_average(rounds, round_index))


@router.get("/course-analytics/{user_id}/{course_id}", response_model=CourseAnalyticsResponse)
async def get_course_analytics(
    course_id: UUID,
    user: User = Depends(get_self),
    db: DatabaseManager = Depends(get_db),
):
    rounds_desc = await db.rounds.get_rounds_for_user(str(user.id), limit=None, offset=0, course_id=str(course_id))
    return course_analytics(str(course_id), list(reversed(rounds_desc)))
