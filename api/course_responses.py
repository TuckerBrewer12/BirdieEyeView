from typing import Optional

from analytics.handicap import tee_course_handicap
from api.schemas import CourseResponse, TeeResponse
from models import Course, Tee
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
