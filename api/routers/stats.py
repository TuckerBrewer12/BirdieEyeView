from api.messages import COURSE_ID_MUST_BE_A_VALID_UUID, FRIEND_ID_IS_REQUIRED, NO_BENCHMARK_FOR_THAT_HANDICAP, NO_ROUNDS_FOUND, NO_SCORING_GOAL, ROUND_NOT_IN_HISTORY
from datetime import date, datetime, timedelta, timezone
from typing import List, Literal, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from database.db_manager import DatabaseManager
from api.messages import FORBIDDEN, USER_NOT_FOUND
from api.dependencies import get_current_user, get_db
from api.input_validation import ensure_uuid_str
from models import User
from api.round_responses import round_summary
from api.course_analytics_responses import course_analytics
from api.analytics_responses import analytics_response
from api.schemas import (
    AnalyticsResponse,
    BenchmarkComparisonResponse,
    CourseAnalyticsResponse,
    DashboardResponse,
    GoalReportResponse,
    PlayedCourseResponse,
    RoundComparisonResponse,
)
from analytics import eligibility as el
from analytics import stats as analytics
from analytics import benchmarks
from analytics import dashboard
from analytics import round_comparison
from analytics import verdicts
from analytics import handicap as hcap
from analytics.goals import goal_report

router = APIRouter()

MAX_ANALYTICS_ROUNDS = 500


@router.get("/dashboard/{user_id}", response_model=DashboardResponse)
async def get_dashboard(
    user_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)

    aggregate_rows = await db.rounds.get_round_summaries_for_user(str(user_id), limit=None, offset=0)
    eighteen = _format_totals(aggregate_rows, 18)
    nine = _format_totals(aggregate_rows, 9)
    summaries = aggregate_rows

    best = analytics.best_round(summaries)
    best_summary = round_summary(best) if best else None

    hi_rounds = el.chronological(await db.rounds.get_rounds_for_user(str(user_id), limit=None, offset=0))
    last_20 = analytics.full_rounds(hi_rounds)[-20:]
    index_window = hcap.player_index_window(user, hi_rounds)
    full_trend = hcap.player_handicap_trend(user, hi_rounds)
    by_identity = {id(r): entry for r, entry in zip(hi_rounds, full_trend)}
    handicap_trend = [by_identity[id(r)] for r in last_20]
    whs_rounds = [r for i,r in enumerate(hi_rounds) if i in index_window["eligible"]]
    whs_trend = [by_identity[id(r)] for r in whs_rounds]
    scoring_change = dashboard.scoring_average_change(last_20)
    today = dashboard.today()

    return DashboardResponse(
        total_rounds=len(aggregate_rows), scoring_average=eighteen["average"],
        average_putts=eighteen["average_putts"], average_gir=eighteen["average_gir"],
        scoring_average_nine=nine["average"], best_round_nine=nine["best"],
        best_round_nine_id=nine["best_id"], best_round_nine_course=nine["best_course"],
        average_putts_nine=nine["average_putts"], average_gir_nine=nine["average_gir"],
        best_round=eighteen["best"],
        best_round_id=best_summary.id if best_summary else None,
        best_round_course=best_summary.course_name if best_summary else None,
        best_round_to_par=best_summary.to_par if best_summary else None,
        best_round_date=best_summary.date if best_summary else None,
        handicap_index=index_window["index"],
        recent_rounds=[round_summary(r) for r in summaries[:4]],
        scoring_average_l5=dashboard.scoring_average(last_20, dashboard.RECENT_ROUNDS),
        scoring_average_change=scoring_change,
        scoring_average_verdict=verdicts.change_verdict(scoring_change),
        handicap_change=dashboard.handicap_change(last_20, handicap_trend, today),
        recent_score_mix=dashboard.score_mix(last_20[-dashboard.RECENT_ROUNDS:])["percentages"],
        whs=dashboard.whs_breakdown(
            whs_rounds, whs_trend, hcap.score_differentials_per_round(whs_rounds), index_window
        ),
        score_trend=analytics.score_trend_with_rolling_average(last_20),
        handicap_trend=[
            {**row, "in_window": analytics.in_window(r, reference_date=today)}
            for r, row in zip(last_20, handicap_trend)
        ],
        rounds_this_year=dashboard.rounds_this_year(summaries, today),
    )


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
    today = datetime.now(timezone.utc).date()
    if timeframe == "ytd":
        date_from = date(today.year, 1, 1)
    elif timeframe == "1y":
        date_from = today - timedelta(days=365)

    no_matching_course = course_id == "home" and user.home_course_id is None
    rounds_desc = [] if no_matching_course else await db.rounds.get_rounds_for_user(
        target_user_id, limit=limit, offset=0,
        course_id=resolved_course_id,
        date_from=date_from,
    )
    rounds = list(reversed(rounds_desc))

    filtered = resolved_course_id is not None or date_from is not None
    history_desc = await db.rounds.get_rounds_for_user(
        target_user_id, limit=None, offset=0,
    )

    return analytics_response(
        rounds,
        list(reversed(history_desc)),
        home_course_id=user.home_course_id,
        user=user,
    )


@router.get("/{user_id}/played-courses", response_model=List[PlayedCourseResponse])
async def get_played_courses(
    user_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    courses = await db.rounds.get_played_courses_for_user(str(user_id))
    return [PlayedCourseResponse(**course) for course in courses]


@router.get("/{user_id}/goal-report", response_model=GoalReportResponse)
async def get_goal_report(
    user_id: UUID,
    limit: int = Query(default=50, ge=1, le=500),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)
    if user.scoring_goal is None and user.scoring_goal_nine is None:
        raise HTTPException(400, NO_SCORING_GOAL)

    rounds_desc = await db.rounds.get_rounds_for_user(str(user_id), limit=limit)
    rounds = list(reversed(rounds_desc))

    home_course_rounds = None
    if user.home_course_id:
        home_rounds_desc = await db.rounds.get_rounds_for_user(
            str(user_id), limit=None, course_id=str(user.home_course_id)
        )
        if home_rounds_desc:
            home_course_rounds = list(reversed(home_rounds_desc))

    return GoalReportResponse.model_validate(goal_report(rounds, user.scoring_goal, home_course_rounds, scoring_goal_nine=user.scoring_goal_nine))


@router.get("/{user_id}/benchmark", response_model=BenchmarkComparisonResponse)
async def get_benchmark_comparison(
    user_id: UUID,
    against: Literal["handicap", "friend"],
    handicap: Optional[int] = Query(default=None),
    friend_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=500),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    viewer_id = str(current_user.id)
    if viewer_id != str(user_id):
        raise HTTPException(403, FORBIDDEN)
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
    user_id: UUID,
    round_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    rounds_desc = await db.rounds.get_rounds_for_user(str(user_id), limit=None, offset=0)
    rounds = list(reversed(rounds_desc))

    if not rounds:
        raise HTTPException(404, NO_ROUNDS_FOUND)

    round_index = next((i for i, r in enumerate(rounds) if str(r.id) == str(round_id)), None)
    if round_index is None:
        raise HTTPException(404, ROUND_NOT_IN_HISTORY)

    return RoundComparisonResponse.model_validate(round_comparison.round_vs_average(rounds, round_index))


@router.get("/milestones/{user_id}")
async def get_milestones(
    user_id: UUID,
    limit: int = Query(default=12, ge=1, le=50),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)

    all_rounds = await db.rounds.get_rounds_for_user(str(user_id), limit=None, offset=0)
    rounds_chrono = list(reversed(all_rounds))

    if not rounds_chrono:
        return {"milestones": []}

    achievements = analytics.notable_achievements(rounds_chrono, home_course_id=user.home_course_id)

    def _parse_date(d: str) -> date:
        try:
            return analytics.parse_date_short(d)
        except ValueError:
            return date.min

    milestones = []

    for item in achievements["round_milestones"]["lifetime"]["score_breaks"]:
        a = item["achievement"]
        if a:
            milestones.append({
                "type": "score_break",
                "label": f"First to break {item['threshold']}",
                "date": a["date"],
                "course": a["course"],
                "round_id": a.get("round_id"),
            })

    under_par = achievements["round_milestones"]["lifetime"]["first_round_under_par"]
    if under_par:
        milestones.append({
            "type": "under_par",
            "label": "First round under par",
            "date": under_par["date"],
            "course": under_par["course"],
            "round_id": under_par.get("round_id"),
        })

    eagle = achievements["round_milestones"]["lifetime"]["first_eagle"]
    if eagle:
        milestones.append({
            "type": "eagle",
            "label": "First eagle",
            "date": eagle["date"],
            "course": eagle["course"],
            "round_id": eagle.get("round_id"),
        })

    hio = achievements["round_milestones"]["lifetime"]["first_hole_in_one"]
    if hio:
        milestones.append({
            "type": "hole_in_one",
            "label": "Hole in one",
            "date": hio["date"],
            "course": hio["course"],
            "round_id": hio.get("round_id"),
        })

    for item in achievements["gir_milestones"]["lifetime"]["gir_breaks"]:
        a = item["achievement"]
        if a:
            pct = round(item["threshold"] / 18 * 100)
            milestones.append({
                "type": "gir_break",
                "label": f"First {item['threshold']} GIR in a round ({pct}%)",
                "date": a["date"],
                "course": a["course"],
                "round_id": a.get("round_id"),
            })

    for item in achievements["putting_milestones"]["lifetime"]["putt_breaks"]:
        a = item["achievement"]
        if a:
            milestones.append({
                "type": "putt_break",
                "label": f"First round under {item['threshold']} putts",
                "date": a["date"],
                "course": a["course"],
                "round_id": a.get("round_id"),
            })

    milestones.sort(key=lambda m: _parse_date(m["date"]), reverse=True)
    return {"milestones": milestones[:limit]}


@router.get("/course-analytics/{user_id}/{course_id}", response_model=CourseAnalyticsResponse)
async def get_course_analytics(
    user_id: UUID,
    course_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)

    rounds_desc = await db.rounds.get_rounds_for_user(str(user_id), limit=None, offset=0, course_id=str(course_id))
    return course_analytics(str(course_id), list(reversed(rounds_desc)))


def _format_totals(summaries: list, holes: int) -> dict:
    rows = [r for r in summaries if r.is_complete() and len(r.get_intended_holes()) == holes]
    def average(getter):
        values = [v for r in rows if (v := getter(r)) is not None]
        return round(sum(values) / len(values), 1) if values else None
    best = min(rows, key=lambda r: r.calculate_total_score()) if rows else None
    return dict(average=average(lambda r:r.calculate_total_score()),
                best=best.calculate_total_score() if best else None,
                best_id=str(best.id) if best else None,
                best_course=(best.course_name_played or (best.course.name if best.course else None)) if best else None,
                average_putts=average(lambda r:r.get_total_putts()), average_gir=average(lambda r:r.get_total_gir()))
