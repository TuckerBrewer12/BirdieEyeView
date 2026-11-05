"""GET /api/stats/milestones/{user_id}: the golfer's lifetime firsts, newest first.

These pin the endpoint's output (labels, order, ties, limit, errors) over a known set of rounds,
both calling the route and through the app so the JSON on the wire is covered too.
"""

from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.dependencies import get_current_user, get_db
from api.main import app
from api.routers import stats
from models import HoleScore, Round, User
from tests.helpers import make_mock_database


def _round(when: datetime, course: str, holes: list[HoleScore]) -> Round:
    return Round(
        id=str(uuid4()),
        course_name_played=course,
        tee_box="Blue",
        date=when,
        hole_scores=holes,
    )


def _bogey_round() -> Round:
    """Feb 9: 90 strokes on par 72, 36 putts, 3 greens. Breaks 120 to 95, putts 45 to 39, 3 GIR."""
    return _round(
        datetime(2025, 2, 9),
        "Muni",
        [
            HoleScore(hole_number=n, strokes=5, putts=2, par_played=4, green_in_regulation=n <= 3)
            for n in range(1, 19)
        ],
    )


def _career_round() -> Round:
    """Oct 12: 67 on par 71 with an eagle and an ace, 18 putts, every green."""
    holes = [
        HoleScore(hole_number=1, strokes=2, putts=1, par_played=4, green_in_regulation=True),
        HoleScore(hole_number=2, strokes=1, putts=0, par_played=3, green_in_regulation=True),
    ] + [
        HoleScore(hole_number=n, strokes=4, putts=1, par_played=4, green_in_regulation=True)
        for n in range(3, 19)
    ]
    return _round(datetime(2025, 10, 12), "Links", holes)


def _event(kind: str, label: str, when: str, course: str, played: Round) -> dict:
    return {"type": kind, "label": label, "date": when, "course": course, "round_id": played.id}


def _expected(bogey: Round, career: Round) -> list[dict]:
    """Newest first. October's sorts ahead of February's although "2025/10/12" < "2025/2/9" as
    text, and a round's own milestones keep their order: score breaks, under par, eagle, ace,
    greens, putts."""
    october = [
        *(
            _event("score_break", f"First to break {t}", "2025/10/12", "Links", career)
            for t in (90, 85, 80, 75, 70)
        ),
        _event("under_par", "First round under par", "2025/10/12", "Links", career),
        _event("eagle", "First eagle", "2025/10/12", "Links", career),
        _event("hole_in_one", "Hole in one", "2025/10/12", "Links", career),
        *(
            _event("gir_break", f"First {t} GIR in a round ({pct}%)", "2025/10/12", "Links", career)
            for t, pct in ((6, 33), (9, 50), (12, 67), (15, 83), (18, 100))
        ),
        *(
            _event("putt_break", f"First round under {t} putts", "2025/10/12", "Links", career)
            for t in (36, 33, 30, 27, 24, 21)
        ),
    ]
    february = [
        *(
            _event("score_break", f"First to break {t}", "2025/2/9", "Muni", bogey)
            for t in (120, 110, 100, 95)
        ),
        _event("gir_break", "First 3 GIR in a round (17%)", "2025/2/9", "Muni", bogey),
        *(
            _event("putt_break", f"First round under {t} putts", "2025/2/9", "Muni", bogey)
            for t in (45, 42, 39)
        ),
    ]
    return october + february


def _setup(rounds_newest_first: list[Round]):
    user_id = uuid4()
    user = User(id=str(user_id), name="Golfer", email="golfer@example.com")
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_rounds_for_user = AsyncMock(return_value=rounds_newest_first)
    return user_id, user, db


def _payload(result) -> dict:
    return result if isinstance(result, dict) else result.model_dump()


@pytest.mark.asyncio
async def test_lists_every_lifetime_first_newest_first():
    bogey, career = _bogey_round(), _career_round()
    user_id, user, db = _setup([career, bogey])

    result = await stats.get_milestones(user_id, 50, db, user)

    assert _payload(result) == {"milestones": _expected(bogey, career)}
    db.rounds.get_rounds_for_user.assert_awaited_once_with(str(user_id), limit=500, offset=0)


@pytest.mark.asyncio
async def test_keeps_only_the_newest_up_to_the_limit():
    bogey, career = _bogey_round(), _career_round()
    user_id, user, db = _setup([career, bogey])

    result = await stats.get_milestones(user_id, 3, db, user)

    assert _payload(result) == {"milestones": _expected(bogey, career)[:3]}


@pytest.mark.asyncio
async def test_no_rounds_means_no_milestones():
    user_id, user, db = _setup([])

    result = await stats.get_milestones(user_id, 12, db, user)

    assert _payload(result) == {"milestones": []}


@pytest.mark.asyncio
async def test_a_round_with_no_firsts_lists_nothing():
    # A nine: no score, putt or GIR break counts it, and par on every hole sets no other first.
    nine = _round(
        datetime(2025, 5, 1),
        "Muni",
        [HoleScore(hole_number=n, strokes=4, putts=2, par_played=4) for n in range(1, 10)],
    )
    user_id, user, db = _setup([nine])

    result = await stats.get_milestones(user_id, 12, db, user)

    assert _payload(result) == {"milestones": []}


@pytest.mark.asyncio
async def test_only_the_golfer_can_read_their_milestones():
    user_id, _, db = _setup([])
    someone_else = User(id=str(uuid4()), name="Other", email="other@example.com")

    with pytest.raises(HTTPException) as exc:
        await stats.get_milestones(user_id, 12, db, someone_else)

    assert exc.value.status_code == 403
    db.rounds.get_rounds_for_user.assert_not_awaited()


@pytest.mark.asyncio
async def test_an_unknown_golfer_is_not_found():
    user_id, user, db = _setup([])
    db.users.get_user = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await stats.get_milestones(user_id, 12, db, user)

    assert exc.value.status_code == 404


@pytest.fixture
def client_for():
    def make(user: User, db) -> TestClient:
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: db
        return TestClient(app, base_url="http://localhost")

    yield make
    app.dependency_overrides.clear()


def test_the_json_on_the_wire(client_for):
    bogey, career = _bogey_round(), _career_round()
    user_id, user, db = _setup([career, bogey])
    client = client_for(user, db)

    response = client.get(f"/api/stats/milestones/{user_id}?limit=8", headers={"user-agent": "test"})

    assert response.status_code == 200
    assert response.json() == {"milestones": _expected(bogey, career)[:8]}


def test_the_limit_is_bounded(client_for):
    user_id, user, db = _setup([])
    client = client_for(user, db)

    assert client.get(f"/api/stats/milestones/{user_id}?limit=0", headers={"user-agent": "test"}).status_code == 422
    assert client.get(f"/api/stats/milestones/{user_id}?limit=51", headers={"user-agent": "test"}).status_code == 422
    assert client.get(f"/api/stats/milestones/{user_id}", headers={"user-agent": "test"}).status_code == 200
