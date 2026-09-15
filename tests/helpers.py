from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

from starlette.requests import Request

from models import Course, Hole, HoleScore, Round, Tee, User


class FakeHttpResponse:
    def __init__(self, payload=None, error: Exception | None = None):
        self._payload = payload
        self._error = error

    def raise_for_status(self):
        if self._error:
            raise self._error

    def json(self):
        return self._payload


class FakeAsyncHttpClient:
    response = FakeHttpResponse({})
    calls = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, path, **kwargs):
        self.calls.append(("get", path, kwargs))
        return self.response

    async def post(self, path, **kwargs):
        self.calls.append(("post", path, kwargs))
        return self.response


def make_http_request(
    path: str = "/api/test",
    *,
    method: str = "GET",
    scheme: str = "http",
    headers: list[tuple[bytes, bytes]] | None = None,
    cookies: str | None = None,
    app=None,
    client: tuple[str, int] | None = ("127.0.0.1", 1234),
    server: tuple[str, int] = ("localhost", 80),
) -> Request:
    raw_headers = list(headers or [])
    if cookies:
        raw_headers.append((b"cookie", cookies.encode()))
    return Request(
        {
            "type": "http",
            "method": method,
            "scheme": scheme,
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": raw_headers,
            "client": client,
            "server": server,
            "app": app or SimpleNamespace(state=SimpleNamespace()),
        }
    )


def make_async_repo(**return_values):
    return SimpleNamespace(**{name: AsyncMock(return_value=value) for name, value in return_values.items()})


def make_mock_database(**repositories):
    defaults = {name: make_async_repo() for name in ("courses", "rounds", "users", "user_tees", "friendships")}
    defaults.update(repositories)
    return SimpleNamespace(**defaults)


def make_asyncpg_pool():
    pool = MagicMock()
    connection = AsyncMock()
    pool.acquire.return_value.__aenter__.return_value = connection
    connection.transaction = MagicMock()
    connection.transaction.return_value.__aenter__.return_value = AsyncMock()
    return pool, connection


def make_user(user_id: UUID, **overrides) -> User:
    return User(id=str(user_id), name="Golfer", email="golfer@example.com", **overrides)


def make_course(course_id: UUID, *, owner: UUID | None = None) -> Course:
    return Course(
        id=str(course_id),
        name="Pebble Beach",
        location="Monterey",
        par=72,
        user_id=str(owner) if owner else None,
        holes=[Hole(number=1, par=4, handicap=1)],
    )


def make_round(round_id: UUID, course: Course | None = None) -> Round:
    return Round(
        id=str(round_id),
        course=course,
        course_name_played="Played Course" if course is None else None,
        tee_box="Blue",
        date=datetime(2026, 1, 2),
        hole_scores=[
            HoleScore(
                hole_number=1,
                strokes=5,
                putts=2,
                par_played=4,
                fairway_hit=True,
            ),
            HoleScore(
                hole_number=2,
                strokes=4,
                putts=2,
                par_played=4,
                fairway_hit=False,
            ),
        ],
        notes="Good round",
    )


def make_round_summary(round_id: UUID) -> dict:
    return {
        "id": round_id,
        "course_id": None,
        "course_name": "Pebble Beach",
        "course_location": "Monterey",
        "course_par": 72,
        "tee_box": "Blue",
        "round_date": datetime(2026, 1, 2),
        "total_score": 80,
        "front_nine": 40,
        "back_nine": 40,
        "total_putts": 30,
        "total_gir": 9,
        "fairways_hit": 8,
        "notes": None,
        "hole_scores_summary": [{"hole_number": 1, "strokes": 4}],
    }


def make_friendship_row(requester: UUID, addressee: UUID) -> dict:
    now = datetime(2026, 1, 1)
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


def make_scoring_round(
    score: int = 90,
    *,
    round_id: str = "round-1",
    played_at: datetime | None = None,
    rated: bool = False,
    holes: int = 18,
    par_played: int | None = 4,
) -> Round:
    base, remainder = divmod(score, holes)
    scores = [
        HoleScore(
            hole_number=number,
            strokes=base + (1 if number <= remainder else 0),
            par_played=par_played,
        )
        for number in range(1, holes + 1)
    ]
    course = None
    tee_box = None
    if rated:
        course = Course(
            name="Rated Course",
            holes=[Hole(number=number, par=4, handicap=number) for number in range(1, 19)],
            tees=[Tee(color="Blue", course_rating=72.0, slope_rating=113.0)],
        )
        tee_box = "Blue"
    return Round(
        id=round_id,
        date=played_at,
        course=course,
        tee_box=tee_box,
        hole_scores=scores,
    )


def make_analytics_round(offset: int = 0) -> Round:
    scores = []
    for hole_number in range(1, 19):
        par = 3 if hole_number <= 4 else 4 if hole_number <= 14 else 5
        scores.append(
            HoleScore(
                hole_number=hole_number,
                par_played=par,
                strokes=min(15, par + 1 + (offset % 2)),
                putts=2 + (1 if hole_number % 6 == 0 else 0),
                green_in_regulation=hole_number % 3 == 0,
            )
        )
    return Round(id=f"r-{offset}", hole_scores=scores)
