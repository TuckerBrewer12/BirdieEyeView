from typing import Optional

from fastapi import HTTPException

from api.messages import FORBIDDEN
from database.db_manager import DatabaseManager
from models import Course


async def load_linkable_course(
    db: DatabaseManager,
    course_id: object,
    owner_id: Optional[str],
    *,
    missing_detail: str = "Selected course was not found",
    missing_status: int = 400,
) -> Course:
    course = await db.courses.get_course(str(course_id))
    if course is None:
        raise HTTPException(missing_status, missing_detail)
    if course.user_id is not None and (owner_id is None or str(course.user_id) != str(owner_id)):
        raise HTTPException(403, FORBIDDEN)
    return course
