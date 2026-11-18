from typing import Dict, List, Optional

from analytics.handicap import tee_course_handicap
from analytics.best_rounds import course_record
from api.schemas import CourseResponse, CourseSummaryResponse, TeeResponse
from database.db_manager import DatabaseManager
from models import Course, Round, Tee, User
from models.course import CourseSummary
from models.hole import HOLES_PER_NINE


def _tee(tee: Tee, par: Optional[int], handicap_index: Optional[float], coverage=None) -> TeeResponse:
    rating = tee.get_rating(coverage) if coverage else None
    if rating is None and coverage and tee.rating_holes is None and not tee.ratings:
        slope, course_rating = tee.slope_rating, tee.course_rating
    else:
        slope, course_rating = (rating.slope_rating, rating.course_rating) if rating else (None, None)
    index = handicap_index / 2 if handicap_index is not None and coverage and len(coverage) == HOLES_PER_NINE else handicap_index
    return TeeResponse(
        yardage_holes=tee.yardage_holes, rating_holes=tee.rating_holes, ratings=[r.model_dump() for r in tee.ratings],
        color=tee.color,
        slope_rating=tee.slope_rating,
        course_rating=tee.course_rating,
        hole_yardages=tee.hole_yardages,
        total_yardage=tee.get_total_yardage(),
        front_nine_yardage=tee.front_nine_yardage,
        back_nine_yardage=tee.back_nine_yardage,
        course_handicap=tee_course_handicap(index, slope, course_rating, par),
    )


def course_detail(course: Course, handicap_index: Optional[float] = None) -> CourseResponse:
    par = course.get_par()
    return CourseResponse(
        total_holes=course.total_holes,
        id=course.id,
        name=course.name,
        external_course_id=course.external_course_id,
        location=course.location,
        user_id=course.user_id,
        par=par,
        front_nine_par=course.front_nine_par,
        back_nine_par=course.back_nine_par,
        holes=course.holes,
        tees=[_tee(tee, par, handicap_index, course.get_expected_holes()) for tee in course.tees_by_length()],
    )


def course_summary(course: Course) -> CourseSummaryResponse:
    return CourseSummaryResponse(
        id=course.id,
        name=course.name,
        external_course_id=course.external_course_id,
        source="local",
        location=course.location,
        par=course.get_par(),
        total_holes=len(course.holes),
        tee_count=len(course.tees),
        tees=[t.color for t in course.tees_by_length() if t.color],
    )


def _listed_summary(summary: CourseSummary, record: Optional[dict] = None) -> CourseSummaryResponse:
    best = record["best_round"] if record else None
    return CourseSummaryResponse(
        id=summary.id,
        name=summary.name,
        external_course_id=summary.external_course_id,
        source="local",
        location=summary.location,
        par=summary.par,
        total_holes=summary.hole_count,
        tee_count=summary.tee_count,
        tees=summary.tee_colors,
        rounds_played=record["rounds_played"] if record else 0,
        scoring_average=record["scoring_average"] if record else None,
        best_score=best.calculate_total_score() if best else None,
    )


async def summary_list(
    db: DatabaseManager, summaries: List[CourseSummary], user: Optional[User]
) -> List[CourseSummaryResponse]:
    if not user or not summaries:
        return [_listed_summary(s) for s in summaries]
    rounds = await db.rounds.get_round_summaries_for_user(
        str(user.id), limit=None, course_ids=[s.id for s in summaries]
    )
    by_course: Dict[str, List[Round]] = {}
    for r in rounds:
        if r.course and r.course.id:
            by_course.setdefault(str(r.course.id), []).append(r)
    return [
        _listed_summary(s, course_record(by_course[s.id]) if s.id in by_course else None)
        for s in summaries
    ]


def external_summaries(items: List[dict], limit: int) -> List[CourseSummaryResponse]:
    out = []
    for item in items:
        external_id = item.get("external_course_id")
        if not external_id:
            continue
        location = ", ".join(p for p in (item.get("city"), item.get("state")) if p) or None
        out.append(CourseSummaryResponse(
            id=f"external:{external_id}",
            name=item.get("name"),
            external_course_id=external_id,
            source="external",
            location=location,
            par=None,
            total_holes=0,
            tee_count=0,
        ))
    return out[:limit]
