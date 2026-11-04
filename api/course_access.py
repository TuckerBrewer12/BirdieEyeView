"""Course references users attach to their own data (home course, user tees)."""

from typing import Optional

from fastapi import HTTPException

from database.db_manager import DatabaseManager
from models import Course


async def load_linkable_course(
    db: DatabaseManager,
    course_id: object,
    owner_id: Optional[str],
    *,
    missing_detail: str = "Selected course was not found",
) -> Course:
    """Return the course when ``owner_id`` may link to it, else raise an HTTP error.

    A master course (no owner) is linkable by anyone; a custom course only by its owner. Pass
    ``owner_id=None`` for a caller that owns nothing yet, such as a registering user.
    A missing course is a bad reference in the request body, so it is a 400 rather than a 404.
    """
    course = await db.courses.get_course(str(course_id))
    if course is None:
        raise HTTPException(400, missing_detail)
    if course.user_id is not None and (owner_id is None or str(course.user_id) != str(owner_id)):
        raise HTTPException(403, "Forbidden")
    return course
