from typing import Optional
from uuid import UUID

from fastapi import HTTPException

from api.messages import FORBIDDEN
from database.db_manager import DatabaseManager
from models import Course, User


def require_own_filter(user_id: Optional[UUID], current_user: Optional[User]) -> None:
    if user_id and (current_user is None or str(current_user.id) != str(user_id)):
        raise HTTPException(403, FORBIDDEN)


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
