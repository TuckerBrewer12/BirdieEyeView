from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from api.request_models import SaveRoundRequest
from services.golfcourse_api_service import ProviderTee
from services.scan_service import ScanService
from tests.integration.helpers import create_user


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

PARS = [4, 3, 5, 4, 4, 3, 5, 4, 4]
BLUE = [400, 180, 520, 410, 390, 170, 540, 380, 420]


def make_request(user_id: str, **overrides) -> SaveRoundRequest:
    payload = {
        "user_id": user_id,
        "course_name": "Transaction Links",
        "course_location": "Scanned City, CA",
        "tee_box": "Blue",
        "all_tees": [{"color": "Blue", "course_rating": 71.2, "slope_rating": 125,
                      "hole_yardages": {str(n): y for n, y in enumerate(BLUE, start=1)}}],
        "course_holes": [{"hole_number": n, "par": par, "handicap": n} for n, par in enumerate(PARS, start=1)],
        "hole_scores": [{"hole_number": n, "strokes": par, "putts": 2} for n, par in enumerate(PARS, start=1)],
    }
    payload.update(overrides)
    return SaveRoundRequest.model_validate(payload)


def make_service(database_manager, *, blue=BLUE):
    provider = SimpleNamespace(
        search_external_courses=AsyncMock(),
        get_course_details=AsyncMock(return_value=[
            ProviderTee("male", "Championship", dict(enumerate(PARS, start=1)), dict(enumerate(blue, start=1)))
        ]),
    )
    return ScanService(database_manager, provider), provider


async def count(database_manager, sql: str, *args) -> int:
    async with database_manager._pool.acquire() as conn:
        return await conn.fetchval(sql, *args)


async def test_failed_round_write_rolls_back_the_new_course(database_manager):
    user = await create_user(database_manager, email="rollback@example.com")
    service, _ = make_service(database_manager)
    real_create_round = database_manager.rounds.create_round

    async def create_round_then_fail(*args, **kwargs):
        await real_create_round(*args, **kwargs)
        raise RuntimeError("simulated failure after the round insert")

    database_manager.rounds.create_round = create_round_then_fail

    with pytest.raises(RuntimeError, match="simulated failure"):
        await service.save_reviewed_scan(make_request(user.id))

    assert await count(database_manager, "SELECT COUNT(*) FROM courses.courses") == 0
    assert await count(database_manager, "SELECT COUNT(*) FROM courses.tees") == 0
    assert await count(database_manager, "SELECT COUNT(*) FROM users.rounds") == 0


async def test_verified_pick_creates_one_master_and_later_saves_link_to_it(database_manager):
    first = await create_user(database_manager, email="first@example.com")
    second = await create_user(database_manager, email="second@example.com")
    service, provider = make_service(database_manager)

    saved_first = await service.save_reviewed_scan(make_request(first.id, external_course_id="ext-tx"))
    saved_second = await service.save_reviewed_scan(make_request(second.id, external_course_id="ext-tx"))

    master = saved_first.course
    assert (master.user_id, master.external_course_id, master.location) == (None, "ext-tx", None)
    assert master.get_tee("Blue").course_rating == 71.2
    assert saved_second.course.id == master.id
    assert await count(database_manager, "SELECT COUNT(*) FROM courses.courses") == 1
    provider.get_course_details.assert_awaited_once()


async def test_unverified_pick_creates_user_course_without_provider_id(database_manager):
    user = await create_user(database_manager, email="unverified@example.com")
    service, _ = make_service(database_manager, blue=[y + 1 for y in BLUE])

    saved = await service.save_reviewed_scan(make_request(user.id, external_course_id="ext-off"))

    assert (saved.course.user_id, saved.course.external_course_id) == (user.id, None)


async def test_verified_scan_updates_stale_master_and_reorders_handicaps(database_manager):
    user = await create_user(database_manager, email="stale@example.com")
    service, _ = make_service(database_manager)
    stale = [y - 10 for y in BLUE]
    seed, _ = make_service(database_manager, blue=stale)
    seeded = await seed.save_reviewed_scan(make_request(
        user.id,
        external_course_id="ext-stale",
        all_tees=[{"color": "Blue", "hole_yardages": {str(n): y for n, y in enumerate(stale, start=1)}}],
    ))
    reordered = [{"hole_number": n, "par": par, "handicap": 10 - n} for n, par in enumerate(PARS, start=1)]

    await service.save_reviewed_scan(make_request(user.id, course_id=seeded.course.id, course_holes=reordered))

    master = await database_manager.courses.get_course(seeded.course.id)
    assert dict(master.get_tee("Blue").hole_yardages) == dict(enumerate(BLUE, start=1))
    assert [hole.handicap for hole in master.holes] == [10 - n for n in range(1, 10)]
    assert await count(database_manager, "SELECT COUNT(*) FROM users.rounds") == 2
