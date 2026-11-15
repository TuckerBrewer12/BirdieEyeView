from datetime import datetime, timezone
from uuid import UUID, uuid4

from models import Course, Hole, HoleScore, Round, User
from models.course import CourseSummary


def profile_user(user_id: UUID, **overrides) -> User:
    return User(id=str(user_id), name="Golfer", email="golfer@example.com", **overrides)


def pebble_beach_summary(course_id: UUID) -> CourseSummary:
    return CourseSummary(
        id=str(course_id), name="Pebble Beach", location="Monterey", par=72, hole_count=1, tee_count=2,
        tee_colors=["Blue", "White"],
    )


def pebble_beach(course_id: UUID, *, owner: UUID | None = None) -> Course:
    return Course(
        id=str(course_id),
        name="Pebble Beach",
        location="Monterey",
        par=72,
        user_id=str(owner) if owner else None,
        holes=[Hole(number=1, par=4, handicap=1)],
    )


def listed_round(round_id: UUID) -> Round:
    return Round(
        id=str(round_id),
        course=Course(id=str(uuid4()), name="Pebble Beach", location="Monterey", par=72),
        tee_box="Blue",
        date=datetime(2026, 1, 2, tzinfo=timezone.utc),
        hole_scores=[
            HoleScore(hole_number=n, strokes=5 if n <= 8 else 4, putts=2, par_played=4)
            for n in range(1, 19)
        ],
    )


def played_round(round_id: UUID, course: Course | None = None) -> Round:
    return Round(
        id=str(round_id),
        course=course,
        course_name_played="Played Course" if course is None else None,
        tee_box="Blue",
        date=datetime(2026, 1, 2, tzinfo=timezone.utc),
        hole_scores=[
            HoleScore(hole_number=1, strokes=5, putts=2, par_played=4, fairway_hit=True),
            HoleScore(hole_number=2, strokes=4, putts=2, par_played=4, fairway_hit=False),
        ],
        notes="Good round",
    )


def friendship_row(requester: UUID, addressee: UUID) -> dict:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return {
        "id": uuid4(),
        "requester_id": requester,
        "addressee_id": addressee,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "requester_name": "One",
        "addressee_name": "Two",
    }
