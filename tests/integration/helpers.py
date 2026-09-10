from datetime import datetime, timezone

from database import DatabaseManager
from models import Course, Hole, HoleScore, Round, Tee, User, UserTee


async def create_user(
    database_manager: DatabaseManager,
    *,
    email: str,
    name: str = "Test Golfer",
) -> User:
    return await database_manager.users.create_user(
        User(name=name, email=email, handicap=8.4),
        password_hash="test-password-hash",
    )


async def create_course(
    database_manager: DatabaseManager,
    *,
    name: str = "Integration Hills",
    location: str = "Testville, CA",
    external_course_id: str | None = "integration-course-1",
    user_id: str | None = None,
) -> Course:
    return await database_manager.courses.create_course(
        make_course(
            name=name,
            location=location,
            external_course_id=external_course_id,
        ),
        user_id=user_id,
    )


def make_complete_scores(
    *,
    first_hole_strokes: int = 4,
    include_par: bool = False,
) -> list[HoleScore]:
    return [
        HoleScore(
            hole_number=hole_number,
            strokes=first_hole_strokes if hole_number == 1 else 4,
            putts=2,
            green_in_regulation=hole_number % 2 == 0,
            fairway_hit=hole_number % 3 == 0,
            par_played=4 if include_par else None,
            handicap_played=hole_number if include_par else None,
        )
        for hole_number in range(1, 19)
    ]


async def create_round(
    database_manager: DatabaseManager,
    *,
    user_id: str,
    course: Course | None = None,
    course_name_played: str | None = None,
) -> Round:
    return await database_manager.rounds.create_round(
        Round(
            course=course,
            tee_box="Blue",
            course_name_played=course_name_played,
            date=datetime(2026, 9, 7, tzinfo=timezone.utc),
            notes="Integration round",
            hole_scores=make_complete_scores(),
        ),
        user_id,
        course_id=course.id if course else None,
    )


async def create_user_tee(
    database_manager: DatabaseManager,
    *,
    user_id: str,
    course_id: str,
    name: str = "Blue-Gold Combo",
) -> UserTee:
    return await database_manager.user_tees.create_user_tee(
        UserTee(
            user_id=user_id,
            course_id=course_id,
            name=name,
            slope_rating=127,
            course_rating=72.5,
            hole_yardages={1: 415, 2: 390, 18: 445},
        )
    )


def make_course(
    *,
    name: str = "Integration Hills",
    location: str = "Testville, CA",
    external_course_id: str | None = "integration-course-1",
) -> Course:
    holes = [
        Hole(number=hole_number, par=4, handicap=hole_number)
        for hole_number in range(1, 19)
    ]
    tee = Tee(
        color="Blue",
        slope_rating=125,
        course_rating=72.1,
        hole_yardages={
            hole_number: 350 + hole_number * 5
            for hole_number in range(1, 19)
        },
    )
    return Course(
        name=name,
        external_course_id=external_course_id,
        location=location,
        par=72,
        holes=holes,
        tees=[tee],
    )
