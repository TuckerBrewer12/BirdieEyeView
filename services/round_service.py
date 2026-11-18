from database.db_manager import DatabaseManager
from database.exceptions import NotFoundError
from models import Course, Round


async def link_course(db: DatabaseManager, round_id: str, course: Course, user_id: str) -> Round:
    async with db.transaction() as conn:
        round_ = await db.rounds.get_round(round_id, user_id=user_id, connection=conn)
        if round_ is None:
            raise NotFoundError("Round not found")
        if course.user_id is not None and str(course.user_id) == user_id:
            await _fill_course_from_round(db, round_, str(course.id), conn)
        updated = await db.rounds.link_course_to_round(round_id, str(course.id), user_id=user_id, connection=conn)
        if updated is None:
            raise NotFoundError("Round not found")
        return updated


async def _fill_course_from_round(db: DatabaseManager, round_: Round, course_id: str, conn) -> None:
    scan_holes = [
        {"hole_number": hs.hole_number, "par": hs.par_played, "handicap": hs.handicap_played}
        for hs in round_.hole_scores
        if hs.hole_number is not None and hs.par_played is not None
    ]
    if scan_holes:
        await db.courses.fill_course_gaps(course_id, scan_holes, connection=conn)

    source = None
    if round_.user_tee:
        tee = round_.user_tee
        source = (tee.name, tee.slope_rating, tee.course_rating, tee.hole_yardages)
    elif round_.course and round_.tee_box:
        tee = round_.course.get_tee(round_.tee_box)
        if tee:
            source = (tee.color, tee.slope_rating, tee.course_rating, tee.hole_yardages)
    if source and source[0]:
        name, slope, rating, yardages = source
        await db.courses.fill_course_gaps(
            course_id,
            [],
            name,
            slope,
            rating,
            {str(k): v for k, v in (yardages or {}).items() if v is not None},
            connection=conn,
        )
