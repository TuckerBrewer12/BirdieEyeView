from typing import Any, Dict, Optional

from database.db_manager import DatabaseManager
from models import Course, UserTee
from models.hole_layout import rated_coverage

RATING_FIELDS = frozenset({"slope_rating", "course_rating"})


class TeeOutsideCourseLayout(ValueError):
    ...


def _check_yardages(layout: Optional[tuple], yardages: Dict) -> None:
    if layout and any(int(hole) not in layout for hole in yardages):
        raise TeeOutsideCourseLayout("Tee yardages must be for the linked course's holes")


async def create_user_tee(
    db: DatabaseManager, user_id: str, fields: Dict[str, Any], course: Optional[Course]
) -> UserTee:
    layout = course.get_expected_holes() if course is not None else None
    yardages = fields.get("hole_yardages") or {}
    _check_yardages(layout, yardages)
    slope, rating = fields.get("slope_rating"), fields.get("course_rating")
    tee = UserTee(
        user_id=user_id,
        course_id=str(course.id) if course is not None else None,
        name=fields["name"],
        slope_rating=slope,
        course_rating=rating,
        rating_holes=rated_coverage(layout, rating, slope),
        hole_yardages=yardages,
    )
    return await db.user_tees.create_user_tee(tee)


async def update_user_tee(
    db: DatabaseManager, user_id: str, tee_id: str, updates: Dict[str, Any]
) -> Optional[UserTee]:
    existing = await db.user_tees.get_user_tee(tee_id, user_id=user_id)
    if existing is None:
        return None
    course = await db.courses.get_course(existing.course_id) if existing.course_id else None
    layout = course.get_expected_holes() if course is not None else None
    if "hole_yardages" in updates:
        updates["hole_yardages"] = updates["hole_yardages"] or {}
        _check_yardages(layout, updates["hole_yardages"])
    return await db.user_tees.update_user_tee(
        tee_id,
        user_id=user_id,
        rating_layout=layout,
        rate_coverage=bool(RATING_FIELDS & updates.keys()),
        **updates,
    )
