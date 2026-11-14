"""Course responses, built one way from the Course model so every endpoint agrees."""

from typing import Optional

from analytics.handicap import tee_course_handicap
from api.schemas import CourseResponse, TeeResponse
from models import Course, Tee


def _tee(tee: Tee, par: Optional[int], handicap_index: Optional[float]) -> TeeResponse:
    return TeeResponse(
        color=tee.color,
        slope_rating=tee.slope_rating,
        course_rating=tee.course_rating,
        hole_yardages=tee.hole_yardages,
        total_yardage=tee.get_total_yardage(),
        front_nine_yardage=tee.front_nine_yardage,
        back_nine_yardage=tee.back_nine_yardage,
        course_handicap=tee_course_handicap(handicap_index, tee.slope_rating, tee.course_rating, par),
    )


def course_detail(course: Course, handicap_index: Optional[float] = None) -> CourseResponse:
    """A full course, as course details and the round editor read it. With the signed-in golfer's
    index, each tee carries their course handicap off it."""
    par = course.get_par()
    return CourseResponse(
        id=course.id,
        name=course.name,
        external_course_id=course.external_course_id,
        location=course.location,
        user_id=course.user_id,
        par=par,
        front_nine_par=course.front_nine_par,
        back_nine_par=course.back_nine_par,
        holes=course.holes,
        tees=[_tee(tee, par, handicap_index) for tee in course.tees_by_length()],  # longest first
    )
