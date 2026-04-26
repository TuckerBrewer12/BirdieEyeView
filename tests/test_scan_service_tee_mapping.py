from api.request_models import TeeInput
from models import Course, Tee
from services.scan_service import ScanService


def _svc() -> ScanService:
    return ScanService(db=None)  # type: ignore[arg-type]


def test_canonicalize_played_tee_box_prefers_existing_course_tee_label_on_yardage_match() -> None:
    service = _svc()
    course = Course(
        name="Half Moon Bay",
        tees=[
            Tee(
                color="White",
                slope_rating=123,
                course_rating=69.1,
                hole_yardages={1: 360, 2: 297, 3: 118, 4: 446, 5: 408, 6: 351, 7: 143, 8: 475, 9: 156},
            ),
            Tee(
                color="Blue",
                slope_rating=127,
                course_rating=70.8,
                hole_yardages={1: 376, 2: 332, 3: 140, 4: 481, 5: 431, 6: 365, 7: 155, 8: 500, 9: 166},
            ),
        ],
    )
    scan_tees = [
        TeeInput(
            color="White M: 69.1/123",
            slope_rating=None,
            course_rating=None,
            hole_yardages={
                "1": 361, "2": 296, "3": 120, "4": 447, "5": 406,
                "6": 349, "7": 145, "8": 474, "9": 157,
            },
        )
    ]

    canonical = service._canonicalize_played_tee_box(course, "White M: 69.1/123", scan_tees)
    assert canonical == "White"


def test_canonicalize_played_tee_box_defaults_single_course_tee_when_unset() -> None:
    service = _svc()
    course = Course(
        name="Single Tee Course",
        tees=[Tee(color="Gold", hole_yardages={1: 300, 2: 320, 3: 150})],
    )

    canonical = service._canonicalize_played_tee_box(course, None, [])
    assert canonical == "Gold"
