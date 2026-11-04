from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from api.request_models import HoleScoreInput, SaveRoundRequest, TeeInput
from database.exceptions import DuplicateError
from models import Course, Hole, Tee
from services.golfcourse_api_service import CourseProviderNotFound, CourseProviderUnavailable, ProviderTee
from services.scan_service import ScanSaveRejected, ScanService

PARS = [4, 3, 5, 4, 4, 3, 5, 4, 4]
HANDICAPS = [1, 17, 5, 9, 3, 15, 7, 13, 11]
BLUE = [400, 180, 520, 410, 390, 170, 540, 380, 420]
WHITE = [370, 160, 500, 380, 360, 150, 510, 350, 400]


def yardage_map(values):
    return {str(n): yards for n, yards in enumerate(values, start=1)}


def make_scan_database():
    conn = object()

    @asynccontextmanager
    async def transaction():
        db.transactions += 1
        yield conn

    courses = SimpleNamespace(
        get_course=AsyncMock(return_value=None),
        find_course_by_external_id=AsyncMock(return_value=None),
        find_owned_course_by_exact_name=AsyncMock(return_value=None),
        create_course=AsyncMock(
            side_effect=lambda course, user_id=None, connection=None: course.model_copy(
                update={"id": str(uuid4()), "user_id": user_id}
            )
        ),
        fill_course_gaps=AsyncMock(),
        apply_verified_scan=AsyncMock(),
    )
    rounds = SimpleNamespace(create_round=AsyncMock(side_effect=lambda round_, *args, **kwargs: round_))
    db = SimpleNamespace(courses=courses, rounds=rounds, transaction=transaction, transactions=0, conn=conn)
    return db


def make_save_request(**overrides) -> SaveRoundRequest:
    payload = {
        "user_id": "user-1",
        "course_name": "Pebble Beach",
        "course_location": "Monterey, CA",
        "tee_box": "Blue",
        "all_tees": [
            {"color": "Blue", "slope_rating": 125, "course_rating": 71.2, "hole_yardages": yardage_map(BLUE)},
            {"color": "White", "hole_yardages": yardage_map(WHITE)},
        ],
        "hole_scores": [
            {"hole_number": n, "strokes": par + 1, "putts": 2} for n, par in enumerate(PARS, start=1)
        ],
        "course_holes": [
            {"hole_number": n, "par": par, "handicap": hcp}
            for n, (par, hcp) in enumerate(zip(PARS, HANDICAPS), start=1)
        ],
        "date": "2026-09-04T10:30:00",
        "notes": "Reviewed",
    }
    payload.update(overrides)
    return SaveRoundRequest.model_validate(payload)


def make_course(*, owner: str | None = None, external_id: str | None = None, blue=BLUE) -> Course:
    return Course(
        id=str(uuid4()),
        name="Pebble Beach",
        external_course_id=external_id,
        total_holes=9,
        user_id=owner,
        holes=[Hole(number=n, par=par, handicap=hcp) for n, (par, hcp) in enumerate(zip(PARS, HANDICAPS), start=1)],
        tees=[
            Tee(color="Blue", course_rating=71.2, slope_rating=125, hole_yardages=dict(enumerate(blue, start=1))),
            Tee(color="White", hole_yardages=dict(enumerate(WHITE, start=1))),
        ],
    )


def provider_tees(*, blue=BLUE, pars=PARS, blue_rating=(71.2, 125)):
    return [
        ProviderTee(
            "male", "Championship", dict(enumerate(pars, start=1)), dict(enumerate(blue, start=1)), *blue_rating
        ),
        ProviderTee("male", "White", dict(enumerate(PARS, start=1)), dict(enumerate(WHITE, start=1))),
    ]


def make_service(details=None):
    db = make_scan_database()
    provider = SimpleNamespace(
        search_external_courses=AsyncMock(return_value=[]),
        get_course_details=AsyncMock(return_value=provider_tees() if details is None else details),
    )
    return ScanService(db, provider), db, provider


def assert_nothing_written(db):
    assert db.transactions == 0
    db.courses.create_course.assert_not_awaited()
    db.rounds.create_round.assert_not_awaited()


# ================================================================
# Explicit database course
# ================================================================


@pytest.mark.asyncio
async def test_explicit_owned_course_saves_in_one_transaction_without_provider():
    service, db, provider = make_service()
    owned = make_course(owner="user-1")
    db.courses.get_course.return_value = owned

    saved = await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    assert (saved.course, saved.tee_box, saved.date.isoformat()) == (owned, "Blue", "2026-09-04T10:30:00")
    assert db.rounds.create_round.await_args.kwargs == {"course_id": owned.id, "connection": db.conn}
    assert all(call.kwargs["connection"] is db.conn for call in db.courses.fill_course_gaps.await_args_list)
    provider.get_course_details.assert_not_awaited()
    provider.search_external_courses.assert_not_awaited()


@pytest.mark.asyncio
async def test_hole_scores_take_par_and_handicap_from_course():
    service, db, _ = make_service()
    db.courses.get_course.return_value = make_course(owner="user-1")

    saved = await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    assert (saved.hole_scores[0].par_played, saved.hole_scores[0].handicap_played) == (4, 1)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("repository_result", "repository_error", "message"),
    [
        (make_course(owner="other-user"), None, "not accessible"),
        (None, None, "not found"),
        (None, RuntimeError("db"), "invalid"),
    ],
)
async def test_explicit_course_rejects_invalid_course(repository_result, repository_error, message):
    service, db, _ = make_service()
    db.courses.get_course.return_value = repository_result
    db.courses.get_course.side_effect = repository_error

    with pytest.raises(ValueError, match=message):
        await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))
    assert_nothing_written(db)


# ================================================================
# Existing master courses
# ================================================================


@pytest.mark.asyncio
async def test_master_matching_the_scan_makes_no_provider_call():
    service, db, provider = make_service()
    db.courses.get_course.return_value = make_course(external_id="ext-1")

    await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    provider.get_course_details.assert_not_awaited()
    db.courses.apply_verified_scan.assert_not_awaited()
    db.courses.fill_course_gaps.assert_not_awaited()


@pytest.mark.asyncio
async def test_stale_master_is_updated_from_verified_scan():
    service, db, provider = make_service()
    master = make_course(external_id="ext-1", blue=[y - 10 for y in BLUE])
    db.courses.get_course.return_value = master

    await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    provider.get_course_details.assert_awaited_once_with("ext-1")
    call = db.courses.apply_verified_scan.await_args
    assert call.args[0] == master.id
    assert [dict(t.hole_yardages) for t in call.args[2]][0] == dict(enumerate(BLUE, start=1))
    assert call.kwargs == {"total_holes": 9, "connection": db.conn}


@pytest.mark.asyncio
async def test_picked_master_without_course_name_is_still_verified():
    service, db, provider = make_service()
    master = make_course(external_id="ext-1", blue=[y - 10 for y in BLUE])
    db.courses.get_course.return_value = master

    await service.save_reviewed_scan(make_save_request(course_id=str(uuid4()), course_name=None))

    provider.get_course_details.assert_awaited_once_with("ext-1")
    db.courses.apply_verified_scan.assert_awaited_once()


@pytest.mark.asyncio
async def test_rating_only_correction_updates_master_when_provider_agrees():
    service, db, provider = make_service()
    master = make_course(external_id="ext-1")
    master.tees[0] = Tee(color="Blue", course_rating=70.0, slope_rating=125, hole_yardages=dict(enumerate(BLUE, start=1)))
    db.courses.get_course.return_value = master

    await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    provider.get_course_details.assert_awaited_once_with("ext-1")
    blue = db.courses.apply_verified_scan.await_args.args[2][0]
    assert (blue.course_rating, blue.slope_rating) == (71.2, 125)


UNCONFIRMED_RATINGS = pytest.mark.parametrize(
    "provider_rating", [(72.0, 125), (71.2, 130), (None, None)], ids=["course", "slope", "missing"]
)


@pytest.mark.asyncio
@UNCONFIRMED_RATINGS
async def test_unconfirmed_rating_never_blocks_verification_and_is_not_stored(provider_rating):
    service, db, _ = make_service(details=provider_tees(blue_rating=provider_rating))
    master = make_course(external_id="ext-1", blue=[y - 10 for y in BLUE])
    master.tees[0] = master.tees[0].model_copy(update={"course_rating": 70.0, "slope_rating": 120})
    db.courses.get_course.return_value = master

    await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    blue = db.courses.apply_verified_scan.await_args.args[2][0]
    assert dict(blue.hole_yardages) == dict(enumerate(BLUE, start=1))  # verified yardages still applied
    assert (blue.course_rating, blue.slope_rating) == (70.0, 120)  # scanned 71.2/125 dropped, master's kept


@pytest.mark.asyncio
@UNCONFIRMED_RATINGS
async def test_unconfirmed_rating_only_difference_writes_nothing(provider_rating):
    service, db, _ = make_service(details=provider_tees(blue_rating=provider_rating))
    master = make_course(external_id="ext-1")
    master.tees[0] = master.tees[0].model_copy(update={"course_rating": 70.0})
    db.courses.get_course.return_value = master

    await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    db.courses.apply_verified_scan.assert_not_awaited()


@pytest.mark.asyncio
@UNCONFIRMED_RATINGS
async def test_new_master_drops_unconfirmed_ratings(provider_rating):
    service, db, _ = make_service(details=provider_tees(blue_rating=provider_rating))

    await service.save_reviewed_scan(make_save_request(external_course_id="ext-1"))

    created = db.courses.create_course.await_args
    blue = created.args[0].get_tee("Blue")
    assert created.kwargs["user_id"] is None  # still verified as a master
    assert (blue.course_rating, blue.slope_rating) == (None, None)


@pytest.mark.asyncio
async def test_scan_without_ratings_keeps_master_ratings():
    service, db, provider = make_service()
    db.courses.get_course.return_value = make_course(external_id="ext-1", blue=[y - 10 for y in BLUE])
    request = make_save_request(
        course_id=str(uuid4()),
        all_tees=[{"color": "Blue", "hole_yardages": yardage_map(BLUE)}, {"color": "White", "hole_yardages": yardage_map(WHITE)}],
    )

    await service.save_reviewed_scan(request)

    blue = db.courses.apply_verified_scan.await_args.args[2][0]
    assert (blue.course_rating, blue.slope_rating) == (71.2, 125)


@pytest.mark.asyncio
async def test_missing_scanned_ratings_are_not_a_difference():
    service, db, provider = make_service()
    db.courses.get_course.return_value = make_course(external_id="ext-1")
    request = make_save_request(
        course_id=str(uuid4()),
        all_tees=[{"color": "Blue", "hole_yardages": yardage_map(BLUE)}, {"color": "White", "hole_yardages": yardage_map(WHITE)}],
    )

    await service.save_reviewed_scan(request)

    provider.get_course_details.assert_not_awaited()
    db.courses.apply_verified_scan.assert_not_awaited()


@pytest.mark.asyncio
async def test_verified_par_change_reaches_the_saved_round():
    service, db, _ = make_service()
    master = make_course(external_id="ext-1")
    master.holes[0] = Hole(number=1, par=5, handicap=HANDICAPS[0])  # stale; the scan and provider say 4
    db.courses.get_course.return_value = master

    saved = await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    db.courses.apply_verified_scan.assert_awaited_once()
    assert saved.hole_scores[0].par_played == 4


@pytest.mark.asyncio
@pytest.mark.parametrize("declared_holes", [18, None], ids=["declared", "legacy-undeclared"])
async def test_front_nine_scan_never_rewrites_an_eighteen_hole_master(declared_holes):
    service, db, provider = make_service()
    back_handicaps = [2, 18, 6, 10, 4, 16, 8, 14, 12]
    master = Course(
        id=str(uuid4()),
        name="Pebble Beach",
        external_course_id="ext-1",
        total_holes=declared_holes,
        user_id=None,
        holes=[
            Hole(number=n, par=par, handicap=hcp)
            for n, (par, hcp) in enumerate(zip(PARS + PARS, HANDICAPS + back_handicaps), start=1)
        ],
        tees=[Tee(color="Blue", hole_yardages=dict(enumerate([y - 10 for y in BLUE + BLUE], start=1)))],
    )
    db.courses.get_course.return_value = master

    saved = await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    provider.get_course_details.assert_not_awaited()
    db.courses.apply_verified_scan.assert_not_awaited()
    assert saved.course == master


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "details_error",
    [CourseProviderUnavailable("down"), CourseProviderNotFound("ext-1"), None],
)
async def test_stale_master_is_left_unchanged_when_not_verified(details_error):
    service, db, provider = make_service(details=provider_tees(blue=[y + 1 for y in BLUE]))
    provider.get_course_details.side_effect = details_error
    master = make_course(external_id="ext-1", blue=[y - 10 for y in BLUE])
    db.courses.get_course.return_value = master

    saved = await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    assert saved.course == master
    db.courses.apply_verified_scan.assert_not_awaited()


@pytest.mark.asyncio
async def test_master_without_provider_id_is_never_verified():
    service, db, provider = make_service()
    db.courses.get_course.return_value = make_course(blue=[y - 10 for y in BLUE])

    await service.save_reviewed_scan(make_save_request(course_id=str(uuid4())))

    provider.get_course_details.assert_not_awaited()
    provider.search_external_courses.assert_not_awaited()
    db.courses.apply_verified_scan.assert_not_awaited()


# ================================================================
# Provider-picked courses
# ================================================================


@pytest.mark.asyncio
async def test_verified_provider_pick_creates_one_master_from_scanned_data():
    service, db, provider = make_service()

    saved = await service.save_reviewed_scan(make_save_request(external_course_id="ext-1"))

    created = db.courses.create_course.await_args
    course = created.args[0]
    assert created.kwargs == {"user_id": None, "connection": db.conn}
    assert (course.name, course.external_course_id, course.location) == ("Pebble Beach", "ext-1", None)
    assert course.get_tee("Blue").course_rating == 71.2  # scanned rating, not provider data
    assert saved.course.user_id is None
    provider.search_external_courses.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "details",
    [
        provider_tees(blue=[BLUE[0] + 1] + BLUE[1:]),
        provider_tees(pars=[5] + PARS[1:]),
    ],
    ids=["one-yard-off", "one-par-off"],
)
async def test_provider_mismatch_saves_user_course_without_provider_id(details):
    service, db, _ = make_service(details=details)

    await service.save_reviewed_scan(make_save_request(external_course_id="ext-1"))

    created = db.courses.create_course.await_args
    assert created.kwargs["user_id"] == "user-1"
    assert created.args[0].external_course_id is None


@pytest.mark.asyncio
async def test_provider_unavailable_saves_user_course():
    service, db, provider = make_service()
    provider.get_course_details.side_effect = CourseProviderUnavailable("down")

    await service.save_reviewed_scan(make_save_request(external_course_id="ext-1"))

    assert db.courses.create_course.await_args.kwargs["user_id"] == "user-1"


@pytest.mark.asyncio
async def test_known_provider_id_links_existing_course_without_details_call():
    service, db, provider = make_service()
    master = make_course(external_id="ext-1")
    db.courses.find_course_by_external_id.return_value = master

    saved = await service.save_reviewed_scan(make_save_request(external_course_id="ext-1"))

    assert saved.course == master
    db.courses.create_course.assert_not_awaited()
    provider.get_course_details.assert_not_awaited()


@pytest.mark.asyncio
async def test_concurrent_master_creation_links_the_winner():
    service, db, _ = make_service()
    winner = make_course(external_id="ext-1")
    db.courses.create_course.side_effect = DuplicateError("exists")
    db.courses.find_course_by_external_id.side_effect = [None, winner]

    saved = await service.save_reviewed_scan(make_save_request(external_course_id="ext-1"))

    assert saved.course == winner
    assert db.courses.find_course_by_external_id.await_args.kwargs == {"connection": db.conn}


# ================================================================
# Typed course names and missing data
# ================================================================


@pytest.mark.asyncio
async def test_typed_name_creates_user_course_without_location_or_provider_call():
    service, db, provider = make_service()

    await service.save_reviewed_scan(make_save_request())

    created = db.courses.create_course.await_args
    assert created.kwargs["user_id"] == "user-1"
    assert (created.args[0].location, created.args[0].external_course_id) == (None, None)
    provider.search_external_courses.assert_not_awaited()
    provider.get_course_details.assert_not_awaited()


@pytest.mark.asyncio
async def test_typed_name_reuses_users_exact_name_course():
    service, db, _ = make_service()
    own = make_course(owner="user-1")
    db.courses.find_owned_course_by_exact_name.return_value = own

    saved = await service.save_reviewed_scan(make_save_request())

    assert saved.course == own
    db.courses.create_course.assert_not_awaited()


@pytest.mark.asyncio
async def test_round_without_course_is_rejected():
    service, db, _ = make_service()

    with pytest.raises(ScanSaveRejected, match="Select or enter the course"):
        await service.save_reviewed_scan(make_save_request(course_name=None))
    assert_nothing_written(db)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        (
            {"course_holes": [{"hole_number": n, "par": 4 if n not in (7, 8) else None} for n in range(1, 10)]},
            "Missing par for holes 7, 8",
        ),
        ({"course_holes": [{"hole_number": n, "par": 4} for n in range(1, 18)]}, "cover holes 1-9 or 1-18"),
        ({"all_tees": [{"color": "Blue", "hole_yardages": {"1": 400}}]}, "No tee has a yardage for every hole"),
        ({"tee_box": "Gold"}, "selected tee 'Gold'"),
        ({"all_tees": None, "tee_box": None}, "No tee has a yardage"),
    ],
)
async def test_incomplete_new_course_is_rejected_before_any_write(overrides, message):
    service, db, provider = make_service()

    with pytest.raises(ScanSaveRejected, match=message):
        await service.save_reviewed_scan(make_save_request(external_course_id="ext-1", **overrides))
    assert_nothing_written(db)
    provider.get_course_details.assert_not_awaited()


@pytest.mark.asyncio
async def test_duplicate_tee_names_are_rejected():
    service, db, _ = make_service()
    tees = [{"color": "Blue", "hole_yardages": yardage_map(BLUE)}, {"color": "BLUE", "hole_yardages": {}}]

    with pytest.raises(ScanSaveRejected, match="different name"):
        await service.save_reviewed_scan(make_save_request(all_tees=tees))
    assert_nothing_written(db)


@pytest.mark.asyncio
async def test_invalid_hole_score_is_rejected_not_rewritten():
    service, db, _ = make_service()
    request = make_save_request()
    request.hole_scores[0] = HoleScoreInput.model_construct(
        hole_number=1, strokes=2, putts=3, net_score=None, shots_to_green=None,
        fairway_hit=None, green_in_regulation=None, par_played=None, handicap_played=None,
    )

    with pytest.raises(ScanSaveRejected, match="Hole 1"):
        await service.save_reviewed_scan(request)
    assert_nothing_written(db)


def test_unparseable_date_is_rejected():
    with pytest.raises(ScanSaveRejected, match="date"):
        ScanService._parse_date("not a date")


# ================================================================
# Played tee and verification rule
# ================================================================


@pytest.mark.asyncio
async def test_no_tee_selection_stays_unselected():
    service, db, _ = make_service()
    db.courses.get_course.return_value = make_course(owner="user-1")

    saved = await service.save_reviewed_scan(make_save_request(course_id=str(uuid4()), tee_box=None))

    assert saved.tee_box is None


def test_scan_matches_provider_by_yardage_across_groups_and_names():
    scanned = make_course()
    female = ProviderTee("female", "Red", dict(enumerate([5] + PARS[1:], start=1)), dict(enumerate(WHITE, start=1)))
    male = ProviderTee("male", "Forward", dict(enumerate(PARS, start=1)), dict(enumerate(WHITE, start=1)))
    blue = provider_tees()[0]

    assert ScanService._scan_matches_provider(scanned, [female, male, blue])
    assert not ScanService._scan_matches_provider(scanned, [female, blue])  # White only matches wrong pars


def test_scan_without_complete_tee_never_matches():
    scanned = make_course().model_copy(update={"tees": [Tee(color="Blue", hole_yardages={1: 400})]})

    assert not ScanService._scan_matches_provider(scanned, provider_tees())


@pytest.mark.parametrize(("label", "expected"), [("WHITE M 69/123", "white"), ("", None)])
def test_extract_tee_color_token(label, expected):
    assert ScanService._extract_tee_color_token(label) == expected


def test_tee_input_yardages_omit_missing_values():
    tee = TeeInput(color="Blue", hole_yardages={"1": 400, "2": None})

    assert ScanService._tee_input_yardages(tee) == {1: 400}


@pytest.mark.parametrize(
    ("left", "right", "expected"),
    [
        ({}, {1: 1}, (0.0, 0)),
        ({1: 400}, {2: 400}, (0.0, 0)),
        ({1: 400, 2: 200}, {1: 410, 2: 250}, (0.5, 2)),
    ],
)
def test_tee_yardage_similarity(left, right, expected):
    assert ScanService._tee_yardage_similarity(left, right) == expected


def test_build_tees_uses_selected_tee_fallback():
    service, _, _ = make_service()

    tees = service._build_tees(make_save_request(all_tees=[], tee_yardages={"1": 400}))

    assert tees[0].color == "Blue"


def test_build_tees_returns_empty_without_tee_data():
    service, _, _ = make_service()

    assert service._build_tees(make_save_request(tee_box=None, all_tees=None)) == []
