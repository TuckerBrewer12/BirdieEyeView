"""Stats/dashboard API endpoints."""

from datetime import date, datetime, timedelta
from typing import Literal, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from database.db_manager import DatabaseManager
from api.dependencies import get_current_user, get_db
from api.input_validation import ensure_uuid_str
from models import User
from api.schemas import DashboardResponse, RoundSummaryResponse
from analytics import eligibility as el
from analytics import stats as analytics
from analytics import handicap as hcap

router = APIRouter()


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

    # Single aggregate query over the full history (no hole_score fetches). Round totals come
    # from complete rounds by format; nine-hole rounds are reported alongside, never doubled.
    summaries = await db.rounds.get_round_summaries_for_user(str(user_id), limit=None, offset=0)
    eighteen = _format_totals(summaries, 18)
    nine = _format_totals(summaries, 9)

    # Build recent_rounds response objects from summaries (first 5)
    def _summary_to_response(row: dict) -> RoundSummaryResponse:
        return RoundSummaryResponse(
            id=str(row["id"]),
            course_id=str(row["course_id"]) if row["course_id"] else None,
            course_name=row["course_name"],
            course_location=row["course_location"],
            course_par=row["course_par"],
            tee_box=row["tee_box"],
            date=row["round_date"],
            total_score=row["total_score"],
            to_par=row["to_par"],
            front_nine=row["front_nine"],
            back_nine=row["back_nine"],
            total_putts=row["total_putts"],
            total_gir=row["total_gir"],
            fairways_hit=row["fairways_hit"],
            notes=row["notes"],
        )

    recent_rounds = [_summary_to_response(r) for r in summaries[:5]]

    # Same handicap as every other screen: full history plus the user's seed and reset date.
    history = await db.rounds.get_rounds_for_user(str(user_id), limit=None, offset=0)
    calculated_hi = hcap.user_handicap_index(history, user)

    return DashboardResponse(
        total_rounds=len(summaries),
        scoring_average=eighteen["average"],
        best_round=eighteen["best"],
        best_round_id=eighteen["best_id"],
        best_round_course=eighteen["best_course"],
        handicap_index=calculated_hi,
        recent_rounds=recent_rounds,
        average_putts=eighteen["average_putts"],
        average_gir=eighteen["average_gir"],
        scoring_average_nine=nine["average"],
        best_round_nine=nine["best"],
        best_round_nine_id=nine["best_id"],
        best_round_nine_course=nine["best_course"],
        average_putts_nine=nine["average_putts"],
        average_gir_nine=nine["average_gir"],
    )


def _format_totals(summaries: list, holes: int) -> dict:
    """Average/best score, putts and GIR over complete rounds of one format (newest best wins ties)."""
    rows = [
        r for r in summaries
        if r.get("is_complete") and r.get("hole_count") == holes and r["total_score"] is not None
    ]

    def average(key: str) -> Optional[float]:
        values = [r[key] for r in rows if r[key] is not None]
        return round(sum(values) / len(values), 1) if values else None

    best = min(rows, key=lambda r: r["total_score"]) if rows else None
    return {
        "average": average("total_score"),
        "best": best["total_score"] if best else None,
        "best_id": str(best["id"]) if best else None,
        "best_course": best["course_name"] if best else None,
        "average_putts": average("total_putts"),
        "average_gir": average("total_gir"),
    }


def _build_handicap_trend(history, display_rounds, user):
    """Index trend over the full calculation history, shown only for the displayed rounds.

    ``used_in_hi`` marks the rounds the current index actually uses (from the whole history),
    so filters and the display window never change which rounds count.
    """
    full = hcap.handicap_trend(history, seed_handicap=user.handicap, seed_set_at=user.last_handicap_update)
    shown = {str(r.id) for r in display_rounds}
    entries = [entry for entry in full if str(entry["round_id"]) in shown]
    for index, entry in enumerate(entries, start=1):
        entry["round_index"] = index
    return entries


@router.get("/analytics/{user_id}")
async def get_analytics(
    user_id: UUID,
    limit: int = Query(default=50, ge=1, le=500),
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

    # Resolve course_id filter. "home" with no home course matches nothing, never all courses.
    resolved_course_id: Optional[str] = None
    no_matching_course = False
    if course_id and course_id not in ("all", ""):
        if course_id == "home":
            resolved_course_id = str(user.home_course_id) if user.home_course_id else None
            no_matching_course = resolved_course_id is None
        else:
            try:
                resolved_course_id = ensure_uuid_str(course_id, "course_id")
            except ValueError as exc:
                raise HTTPException(422, str(exc))

    # Resolve date_from filter
    date_from: Optional[date] = None
    today = date.today()
    if timeframe == "ytd":
        date_from = date(today.year, 1, 1)
    elif timeframe == "1y":
        date_from = today - timedelta(days=365)

    rounds: list = []
    lifetime_rounds: list = []
    if not no_matching_course:
        # DB returns newest-first; reverse for chronological trend ordering
        rounds_desc = await db.rounds.get_rounds_for_user(
            target_user_id, limit=limit, offset=0,
            course_id=resolved_course_id,
            date_from=date_from,
        )
        rounds = list(reversed(rounds_desc))

        # Lifetime achievements use the full history for the selected course (no limit or timeframe).
        lifetime_rounds = list(reversed(await db.rounds.get_rounds_for_user(
            target_user_id, limit=None, offset=0, course_id=resolved_course_id,
        )))

    # Empty and populated responses come from the same code path, so their keys always match.
    by_format = el.by_format(rounds)
    scores_18 = [r.calculate_total_score() for r in by_format[18]]
    scores_9 = [r.calculate_total_score() for r in by_format[9]]
    gir_data = analytics.overall_gir_percentage(rounds)
    putts_gir_data = analytics.overall_putts_per_gir(rounds)
    scrambling_rows = analytics.scrambling_per_round(rounds)
    avg_scrambling = analytics.overall_scrambling(rounds)["percentage"]
    ud_rows = analytics.up_and_down_trend(rounds)
    avg_up_and_down = analytics.overall_up_and_down(rounds)["percentage"]

    # The handicap is the user's current index: full unfiltered history, never the chart filters.
    handicap_history = lifetime_rounds if resolved_course_id is None and not no_matching_course else list(
        reversed(await db.rounds.get_rounds_for_user(target_user_id, limit=None, offset=0))
    )
    current_hi = hcap.user_handicap_index(handicap_history, user)

    return {
        "kpis": {
            "scoring_average": round(sum(scores_18) / len(scores_18), 1) if scores_18 else None,
            "scoring_average_nine": round(sum(scores_9) / len(scores_9), 1) if scores_9 else None,
            "gir_percentage": (
                round(gir_data["gir_percentage"], 1)
                if gir_data["gir_percentage"] is not None
                else None
            ),
            "putts_per_gir": (
                round(putts_gir_data["putts_per_gir"], 2)
                if putts_gir_data["putts_per_gir"] is not None
                else None
            ),
            "scrambling_percentage": round(avg_scrambling, 1) if avg_scrambling is not None else None,
            "up_and_down_percentage": round(avg_up_and_down, 1) if avg_up_and_down is not None else None,
            "handicap_index": current_hi,
            "total_rounds": len(rounds),
        },
        "score_trend": analytics.score_trend(rounds),
        "net_score_trend": analytics.net_score_trend(rounds, current_hi),
        "gir_trend": analytics.gir_per_round(rounds),
        "putts_trend": analytics.putts_per_round(rounds),
        "three_putts_trend": analytics.three_putts_per_round(rounds),
        "scrambling_trend": scrambling_rows,
        "up_and_down_trend": ud_rows,
        "score_type_distribution": analytics.score_type_distribution_per_round(rounds),
        "scoring_by_par": analytics.scoring_by_par(rounds),
        "scoring_by_yardage": analytics.scoring_by_yardage_buckets(rounds),
        "scoring_by_handicap": analytics.scoring_vs_hole_handicap(rounds),
        "gir_vs_non_gir": analytics.gir_vs_non_gir_score_distribution(rounds),
        "handicap_trend": _build_handicap_trend(handicap_history, rounds, user),
        "score_differentials": hcap.score_differentials_per_round(rounds),
        "notable_achievements": analytics.notable_achievements(
            lifetime_rounds,
            home_course_id=user.home_course_id,
        ),
    }


@router.get("/{user_id}/played-courses")
async def get_played_courses(
    user_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return distinct courses the user has rounds linked to."""
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, "Forbidden")
    return await db.rounds.get_played_courses_for_user(str(user_id))


@router.get("/{user_id}/goal-report")
async def get_goal_report(
    user_id: UUID,
    limit: int = Query(default=50, ge=1, le=500),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, "Forbidden")
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    if user.scoring_goal is None and user.scoring_goal_nine is None:
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

    from analytics.goals import goal_report
    return goal_report(rounds, user.scoring_goal, home_course_rounds, scoring_goal_nine=user.scoring_goal_nine)


@router.get("/compare/{user_id}/{round_id}")
async def get_round_comparison(
    user_id: UUID,
    round_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, "Forbidden")
    # Full history, so an older round is still found and compared with what came before it.
    rounds_desc = await db.rounds.get_rounds_for_user(str(user_id), limit=None, offset=0)
    rounds = list(reversed(rounds_desc))  # chronological order

    if not rounds:
        raise HTTPException(404, "No rounds found")

    round_index = next((i for i, r in enumerate(rounds) if str(r.id) == str(round_id)), None)
    if round_index is None:
        raise HTTPException(404, "Round not found in user history")

    return {
        "score": analytics.score_comparison(rounds, round_index=round_index),
        "putts": analytics.putts_comparison(rounds, round_index=round_index),
        "gir": analytics.gir_comparison(rounds, round_index=round_index),
        "three_putts": analytics.three_putts_comparison(rounds, round_index=round_index),
        "putts_per_gir": analytics.putts_per_gir_comparison(rounds, round_index=round_index),
        "scrambling": analytics.scrambling_comparison(rounds, round_index=round_index),
    }


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

    all_rounds = await db.rounds.get_rounds_for_user(str(user_id), limit=None, offset=0)
    rounds_chrono = list(reversed(all_rounds))
    round_dates = {str(r.id): el.comparable_datetime(r.date) for r in rounds_chrono if r.date is not None}

    if not rounds_chrono:
        return {"milestones": []}

    achievements = analytics.notable_achievements(rounds_chrono, home_course_id=user.home_course_id)

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

    # Sort by the round's real date (not the display string); ties keep their insertion order.
    milestones.sort(key=lambda m: round_dates.get(str(m.get("round_id")), datetime.min), reverse=True)
    return {"milestones": milestones[:limit]}


@router.get("/course-analytics/{user_id}/{course_id}")
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

    rounds_desc = await db.rounds.get_rounds_for_user(str(user_id), limit=None, offset=0, course_id=str(course_id))
    course_rounds = list(reversed(rounds_desc))

    return {
        "course_id": str(course_id),
        "rounds_played": len(course_rounds),
        "score_trend_on_course": analytics.score_trend_on_this_course(course_rounds),
        "average_score_relative_to_par_by_hole": analytics.average_score_relative_to_par_by_hole(course_rounds),
        "gir_percentage_by_hole": analytics.gir_percentage_by_hole(course_rounds),
        "average_putts_by_hole": analytics.average_putts_by_hole(course_rounds),
        "score_type_distribution_by_hole": analytics.score_type_distribution_by_hole(course_rounds),
        "course_difficulty_profile_by_hole": analytics.course_difficulty_profile_by_hole(course_rounds),
        "average_score_when_gir_vs_missed": analytics.average_score_when_gir_vs_missed(course_rounds),
        "score_variance_by_hole": analytics.score_variance_by_hole(course_rounds),
    }
