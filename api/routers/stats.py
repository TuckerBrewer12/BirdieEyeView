"""Stats/dashboard API endpoints."""

from datetime import date, datetime, timedelta, timezone
from typing import List, Literal, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from database.db_manager import DatabaseManager
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
from analytics import stats as analytics
from analytics import benchmarks
from analytics import dashboard
from analytics import handicap as hcap
from analytics.goals import goal_report

router = APIRouter()

# The most rounds the analytics page reads at once.
MAX_ANALYTICS_ROUNDS = 500


@router.get("/dashboard/{user_id}", response_model=DashboardResponse)
async def get_dashboard(
    user_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, "Forbidden")
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, "User not found")

    # One query for every round's hole scores; the Round model works out each figure.
    summaries = await db.rounds.get_round_summaries_for_user(str(user_id), limit=500, offset=0)
    total_rounds = await db.rounds.count_rounds_for_user(str(user_id))

    scored = [r for r in summaries if r.calculate_total_score() is not None]
    scores = [r.calculate_total_score() for r in scored]
    putts = [p for p in (r.get_total_putts() for r in summaries) if p is not None]
    girs = [g for g in (r.get_total_gir() for r in summaries) if g is not None]

    # Best as the round list's Best ranks rounds; newest first, so a tie goes to the newest.
    best = analytics.best_round(summaries)
    best_summary = round_summary(best) if best else None

    recent = summaries[:5]
    recent_rounds = [round_summary(r) for r in recent]
    best_recent = analytics.best_round(recent)

    # The last 20 rounds, plus 19 before them so the handicap trend has a full rolling window.
    hi_rounds = list(reversed(await db.rounds.get_rounds_for_user(str(user_id), limit=39, offset=0)))
    last_20 = hi_rounds[-20:]
    # The golfer's own index, as `api/player_handicap.player_handicap_index` reads it: the same
    # last 20 rounds, held at the handicap they gave. The trend's last point is the same index.
    index_window = hcap.player_index_window(user, hi_rounds)
    handicap_trend = hcap.player_handicap_trend(user, hi_rounds)[-len(last_20):] if last_20 else []
    mix = dashboard.score_mix(last_20)
    recent_mix = dashboard.score_mix(last_20[-dashboard.RECENT_ROUNDS:])
    form = dashboard.recent_form(last_20)
    average_putts = round(sum(putts) / len(putts), 1) if putts else None
    putts_shown = dashboard.putts_shown(form["putts_per_18"], average_putts)

    return DashboardResponse(
        total_rounds=total_rounds,
        scoring_average=round(sum(scores) / len(scores), 1) if scores else None,
        best_round=best_summary.total_score if best_summary else None,
        best_round_id=best_summary.id if best_summary else None,
        best_round_course=best_summary.course_name if best_summary else None,
        handicap_index=index_window["index"],
        recent_rounds=recent_rounds,
        best_recent_round_id=best_recent.id if best_recent else None,
        average_putts=average_putts,
        average_gir=round(sum(girs) / len(girs), 1) if girs else None,
        putts_per_round=putts_shown["per_round"],
        putts_rating=putts_shown["rating"],
        scoring_average_l20=dashboard.scoring_average(last_20),
        scoring_average_l5=dashboard.scoring_average(last_20, dashboard.RECENT_ROUNDS),
        scoring_average_change=dashboard.scoring_average_change(last_20),
        handicap_change=dashboard.handicap_change(handicap_trend),
        recent_form=form,
        score_mix=mix["percentages"],
        recent_score_mix=recent_mix["percentages"],
        score_mix_holes=mix["holes"],
        milestones=dashboard.lifetime_milestones(
            analytics.notable_achievements(list(reversed(summaries)), home_course_id=user.home_course_id)
        ),
        whs=dashboard.whs_breakdown(
            last_20, handicap_trend, hcap.score_differentials_per_round(last_20), index_window
        ),
        score_trend=analytics.score_trend(last_20),
        handicap_trend=handicap_trend,
        scrambling_trend=analytics.scrambling_per_round(last_20),
        up_and_down_trend=analytics.up_and_down_trend(last_20),
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
        raise HTTPException(403, "Forbidden")
    user = await db.users.get_user(target_user_id)
    if not user:
        raise HTTPException(404, "User not found")

    # Resolve course_id filter
    resolved_course_id: Optional[str] = None
    if course_id and course_id not in ("all", ""):
        if course_id == "home":
            resolved_course_id = str(user.home_course_id) if user.home_course_id else None
        else:
            try:
                resolved_course_id = ensure_uuid_str(course_id, "course_id")
            except ValueError:
                raise HTTPException(422, "course_id must be a valid UUID.") from None

    # Resolve date_from filter
    date_from: Optional[date] = None
    today = datetime.now(timezone.utc).date()
    if timeframe == "ytd":
        date_from = date(today.year, 1, 1)
    elif timeframe == "1y":
        date_from = today - timedelta(days=365)

    # DB returns newest-first; reverse for chronological trend ordering
    rounds_desc = await db.rounds.get_rounds_for_user(
        target_user_id, limit=limit, offset=0,
        course_id=resolved_course_id,
        date_from=date_from,
    )
    rounds = list(reversed(rounds_desc))

    # The golfer's own rounds, unfiltered, with up to 19 more before the page's so the index after
    # each has a full 20-round window. A course or timeframe narrows the rounds shown, not the
    # golfer's index: that reads every round they played. Narrowed, the page's rounds can be any
    # of theirs, so read as many as the page can ask for.
    filtered = resolved_course_id is not None or date_from is not None
    history_desc = await db.rounds.get_rounds_for_user(
        target_user_id, limit=(MAX_ANALYTICS_ROUNDS if filtered else limit) + 19, offset=0,
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
    """Return distinct courses the user has rounds linked to."""
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, "Forbidden")
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
        raise HTTPException(403, "Forbidden")
    user = await db.users.get_user(str(user_id))
    if not user or not user.scoring_goal:
        raise HTTPException(400, "No scoring goal set")

    rounds_desc = await db.rounds.get_rounds_for_user(str(user_id), limit=limit)
    rounds = list(reversed(rounds_desc))

    home_course_rounds = None
    if user.home_course_id:
        home_rounds_desc = await db.rounds.get_rounds_for_user(
            str(user_id), limit=500, course_id=str(user.home_course_id)
        )
        if home_rounds_desc:
            home_course_rounds = list(reversed(home_rounds_desc))

    return GoalReportResponse.model_validate(goal_report(rounds, user.scoring_goal, home_course_rounds))


@router.get("/{user_id}/benchmark", response_model=BenchmarkComparisonResponse)
async def get_benchmark_comparison(
    user_id: UUID,
    against: Literal["handicap", "peak", "friend"],
    handicap: Optional[int] = Query(default=None),
    friend_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=500),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The player's last `limit` rounds against a handicap's shape, the golfers their peak
    rounds play like, or a friend's last `limit` rounds."""
    viewer_id = str(current_user.id)
    if viewer_id != str(user_id):
        raise HTTPException(403, "Forbidden")
    rounds = list(reversed(await db.rounds.get_rounds_for_user(viewer_id, limit=limit)))

    if against == "handicap":
        if handicap is None or benchmarks.handicap_benchmark(handicap) is None:
            raise HTTPException(422, "No benchmark for that handicap")
        return BenchmarkComparisonResponse.model_validate(benchmarks.handicap_comparison(rounds, handicap))
    if against == "peak":
        return BenchmarkComparisonResponse.model_validate(benchmarks.peak_comparison(rounds))

    if friend_id is None:
        raise HTTPException(422, "friend_id is required")
    if not await db.friendships.are_friends(viewer_id, str(friend_id)):
        raise HTTPException(403, "Forbidden")
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
        raise HTTPException(403, "Forbidden")
    rounds_desc = await db.rounds.get_rounds_for_user(str(user_id), limit=200, offset=0)
    rounds = list(reversed(rounds_desc))  # chronological order

    if not rounds:
        raise HTTPException(404, "No rounds found")

    round_index = next((i for i, r in enumerate(rounds) if str(r.id) == str(round_id)), None)
    if round_index is None:
        raise HTTPException(404, "Round not found in user history")

    return RoundComparisonResponse(
        score=analytics.score_comparison(rounds, round_index=round_index),
        putts=analytics.putts_comparison(rounds, round_index=round_index),
        gir=analytics.gir_comparison(rounds, round_index=round_index),
        three_putts=analytics.three_putts_comparison(rounds, round_index=round_index),
        putts_per_gir=analytics.putts_per_gir_comparison(rounds, round_index=round_index),
        scrambling=analytics.scrambling_comparison(rounds, round_index=round_index),
    )


@router.get("/milestones/{user_id}")
async def get_milestones(
    user_id: UUID,
    limit: int = Query(default=12, ge=1, le=50),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a flat, sorted list of lifetime milestone events for the user."""
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, "Forbidden")
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, "User not found")

    all_rounds = await db.rounds.get_rounds_for_user(str(user_id), limit=500, offset=0)
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

    # Score breaks (break 120, 110, 100, 95, 90, 85, 80, 75, 70 …)
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

    # First round under par
    under_par = achievements["round_milestones"]["lifetime"]["first_round_under_par"]
    if under_par:
        milestones.append({
            "type": "under_par",
            "label": "First round under par",
            "date": under_par["date"],
            "course": under_par["course"],
            "round_id": under_par.get("round_id"),
        })

    # First eagle
    eagle = achievements["round_milestones"]["lifetime"]["first_eagle"]
    if eagle:
        milestones.append({
            "type": "eagle",
            "label": "First eagle",
            "date": eagle["date"],
            "course": eagle["course"],
            "round_id": eagle.get("round_id"),
        })

    # Hole in one
    hio = achievements["round_milestones"]["lifetime"]["first_hole_in_one"]
    if hio:
        milestones.append({
            "type": "hole_in_one",
            "label": "Hole in one",
            "date": hio["date"],
            "course": hio["course"],
            "round_id": hio.get("round_id"),
        })

    # GIR breaks (first 3, 6, 9, 12, 15, 18 GIR in a round)
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

    # Putt breaks (first round under 45, 42, 39, 36, 33, 30 … putts)
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
        raise HTTPException(403, "Forbidden")
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, "User not found")

    rounds_desc = await db.rounds.get_rounds_for_user(str(user_id), limit=500, offset=0, course_id=str(course_id))
    return course_analytics(str(course_id), list(reversed(rounds_desc)))
