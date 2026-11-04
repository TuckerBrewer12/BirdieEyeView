"""Database contracts exercised against disposable PostgreSQL, not SQL mocks."""

import asyncio
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import asyncpg
import pytest

from database import DatabaseManager
from database.exceptions import ConflictError, DuplicateError, IntegrityError
from models import BACK_NINE, FRONT_NINE, FULL_ROUND, Course, Hole, HoleScore, Round, Tee, TeeRating, User, UserTee
from tests.integration.helpers import create_course, create_user

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def make_course(database_manager, *, count=18, **values):
    return await database_manager.courses.create_course(
        Course(
            name="Domain Course",
            total_holes=count,
            holes=[Hole(number=number, par=4, handicap=number) for number in range(1, count + 1)],
            **values,
        )
    )


def scores(numbers, **values):
    return [HoleScore(hole_number=number, strokes=4, **values) for number in numbers]


@pytest.mark.parametrize("course_size,coverage", [(9, FRONT_NINE), (18, FRONT_NINE), (18, BACK_NINE), (18, FULL_ROUND)])
async def test_explicit_format_survives_single_bulk_and_edit(database_manager, course_size, coverage):
    user = await create_user(database_manager, email="formats@example.test")
    course = await make_course(database_manager, count=course_size)
    saved = await database_manager.rounds.create_round(
        Round(course=course, intended_holes=coverage, hole_scores=scores(coverage)),
        user.id,
    )
    assert saved.intended_holes == coverage
    assert saved.is_complete()
    bulk = (await database_manager.rounds.get_rounds_for_user(user.id))[0]
    assert bulk.intended_holes == coverage and bulk.is_complete()
    edited = await database_manager.rounds.update_hole_scores(
        saved.id,
        [HoleScore(hole_number=coverage[0], strokes=5)],
        user_id=user.id,
    )
    assert edited.is_complete()
    async with database_manager._pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users.rounds WHERE id=$1", UUID(saved.id))
    assert row["is_complete"] is True
    assert row["total_score"] == 4 * len(coverage) + 1


async def test_partial_round_preserves_played_unknown_and_zero(database_manager):
    user = await create_user(database_manager, email="partial@example.test")
    course = await make_course(database_manager)
    saved = await database_manager.rounds.create_round(
        Round(
            course=course,
            intended_holes=FRONT_NINE,
            hole_scores=[
                HoleScore(hole_number=1, strokes=1, putts=0, green_in_regulation=False, net_score=-2000),
                HoleScore(hole_number=2, played=False),
                HoleScore(hole_number=3, played=True),
            ],
        ),
        user.id,
    )
    assert saved.calculate_total_score() == 1
    assert not saved.is_complete()
    assert saved.get_hole_score(2).played is False
    assert saved.get_hole_score(3).played is True
    assert saved.get_hole_score(1).net_score == -2000
    summary = (await database_manager.rounds.get_round_summaries_for_user(user.id))[0]
    assert summary["total_putts"] == summary["total_gir"] == 0
    assert summary["to_par"] == saved.total_to_par() == -3
    assert summary["course_par"] == saved.get_par() == 36


async def test_empty_and_unnumbered_rounds_never_write(database_manager):
    user = await create_user(database_manager, email="empty@example.test")
    for round_ in (Round(), Round(hole_scores=[HoleScore(strokes=4)])):
        with pytest.raises(IntegrityError):
            await database_manager.rounds.create_round(round_, user.id)
    async with database_manager._pool.acquire() as conn:
        assert await conn.fetchval("SELECT COUNT(*) FROM users.rounds") == 0


async def test_supplied_totals_invalidate_without_resurrecting_after_reload(database_manager):
    user = await create_user(database_manager, email="summaries@example.test")
    course = await make_course(database_manager)
    saved = await database_manager.rounds.create_round(
        Round(
            course=course,
            intended_holes=FRONT_NINE,
            hole_scores=scores(FRONT_NINE),
            total_putts=30,
            total_gir=4,
        ),
        user.id,
    )
    assert (saved.get_total_putts(), saved.get_total_gir()) == (30, 4)
    notes = await database_manager.rounds.update_round(saved.id, user_id=user.id, notes="unchanged observations")
    assert notes.get_total_putts() == 30
    await database_manager.rounds.upsert_hole_score(saved.id, HoleScore(hole_number=1, strokes=4, putts=2))
    partial = await database_manager.rounds.get_round(saved.id)
    assert partial.get_total_putts() is None
    assert partial.get_total_gir() == 4
    await database_manager.rounds.upsert_hole_score(saved.id, HoleScore(hole_number=1, strokes=4))
    cleared = await database_manager.rounds.get_round(saved.id)
    assert cleared.get_total_putts() is None
    assert cleared.get_total_gir() == 4
    summary = (await database_manager.rounds.get_round_summaries_for_user(user.id))[0]
    assert summary["total_putts"] is None and summary["total_gir"] == 4


async def test_rating_coverage_and_supplied_yardage_survive_clone_and_bulk(database_manager):
    user = await create_user(database_manager, email="ratings@example.test")
    course = await make_course(
        database_manager,
        tees=[
            Tee(
                color="White",
                course_rating=49.4,
                slope_rating=80,
                rating_holes=FULL_ROUND,
                yardage_holes=FULL_ROUND,
                total_yardage=3000,
                ratings=[
                    TeeRating(hole_numbers=FRONT_NINE, course_rating=24.7, slope_rating=75),
                    TeeRating(hole_numbers=BACK_NINE, course_rating=25.2, slope_rating=76),
                ],
            )
        ],
    )
    assert course.get_tee("white").get_total_yardage() == 3000
    cloned = await database_manager.courses.clone_course(course.id, user.id)
    repeated = await database_manager.courses.clone_course(course.id, user.id)
    assert repeated.id == cloned.id and cloned.user_id == user.id
    assert cloned.get_tee("White").get_rating(BACK_NINE).course_rating == 25.2
    await database_manager.rounds.create_round(
        Round(course=course, tee_box="White", hole_scores=scores(FULL_ROUND)), user.id
    )
    bulk = (await database_manager.rounds.get_rounds_for_user(user.id))[0]
    assert bulk.get_tee().get_rating(FRONT_NINE).course_rating == 24.7
    assert bulk.get_tee().get_rating(FULL_ROUND).course_rating == 49.4
    assert bulk.get_tee().get_total_yardage() == 3000


async def test_custom_tee_metadata_and_summary_invalidation(database_manager):
    user = await create_user(database_manager, email="custom@example.test")
    tee = await database_manager.user_tees.create_user_tee(
        UserTee(
            user_id=user.id,
            name="Combo",
            total_yardage=3000,
            yardage_holes=FRONT_NINE,
            ratings=[TeeRating(hole_numbers=FRONT_NINE, course_rating=26.3, slope_rating=70)],
        )
    )
    assert tee.get_total_yardage() == 3000
    assert (await database_manager.user_tees.get_user_tees(user.id))[0].get_rating(FRONT_NINE).course_rating == 26.3
    await database_manager.user_tees.update_user_tee(tee.id, user_id=user.id, hole_yardages={1: 0, 2: 1000})
    cleared = await database_manager.user_tees.update_user_tee(tee.id, user_id=user.id, hole_yardages={})
    assert cleared.get_total_yardage() is None
    assert (await database_manager.user_tees.get_user_tee(tee.id)).get_total_yardage() is None


async def test_goals_are_preserved_on_creation_and_update(database_manager):
    user = await database_manager.users.create_user(
        User(
            name="Goals",
            email="goals@example.test",
            scoring_goal=89,
            scoring_goal_nine=44,
        )
    )
    assert (user.scoring_goal, user.scoring_goal_nine) == (89, 44)
    updated = await database_manager.users.update_user(user.id, scoring_goal_nine=39, email=" GOALS@EXAMPLE.TEST ")
    assert updated.scoring_goal_nine == 39
    assert updated.email == "goals@example.test"


async def test_unlinked_tee_names_are_unique_per_user(database_manager):
    user = await create_user(database_manager, email="unique@example.test")
    other = await create_user(database_manager, email="other@example.test")
    await database_manager.user_tees.create_user_tee(UserTee(user_id=user.id, name="Blue"))
    with pytest.raises(DuplicateError):
        await database_manager.user_tees.create_user_tee(UserTee(user_id=user.id, name="blue"))
    await database_manager.user_tees.create_user_tee(UserTee(user_id=other.id, name="Blue"))
    await database_manager.user_tees.create_user_tee(UserTee(user_id=user.id, name="White"))


async def test_provider_uniqueness_is_scoped(database_manager):
    user = await create_user(database_manager, email="provider@example.test")
    original = await create_course(database_manager, name="Provider Master", external_course_id="provider-1")
    with pytest.raises(DuplicateError):
        await create_course(database_manager, name="Duplicate Master", external_course_id="provider-1")
    owned = await database_manager.courses.clone_course(original.id, user.id)
    assert owned.external_course_id == original.external_course_id


async def test_referenced_custom_tee_deletion_is_a_conflict(database_manager):
    user = await create_user(database_manager, email="delete@example.test")
    tee = await database_manager.user_tees.create_user_tee(UserTee(user_id=user.id, name="Blue"))
    saved = await database_manager.rounds.create_round(
        Round(user_tee=tee, intended_holes=FRONT_NINE, hole_scores=scores(FRONT_NINE)),
        user.id,
    )
    with pytest.raises(ConflictError, match="past rounds"):
        await database_manager.user_tees.delete_user_tee(tee.id, user_id=user.id)
    assert (await database_manager.rounds.get_round(saved.id)).user_tee.id == tee.id
    await database_manager.rounds.delete_round(saved.id, user_id=user.id)
    assert await database_manager.user_tees.delete_user_tee(tee.id, user_id=user.id)


async def test_known_course_location_survives_trigram_fallback(database_manager):
    await create_course(
        database_manager, name="Pebble Beach Golf Links", location="Wrong City", external_course_id=None
    )
    assert await database_manager.courses.find_course_by_name("Pebbel Beach Golf Links", "Right City") is None
    assert await database_manager.courses.find_course_by_name("Pebbel Beach Golf Links", "Wrong City") is not None


async def test_saved_date_and_same_day_order_are_independent(database_manager):
    user = await create_user(database_manager, email="ordering@example.test")
    date = datetime(2020, 4, 1)
    first = await database_manager.rounds.create_round(Round(date=date, hole_scores=scores(FRONT_NINE)), user.id)
    second = await database_manager.rounds.create_round(Round(date=date, hole_scores=scores(FRONT_NINE)), user.id)
    async with database_manager._pool.acquire() as conn:
        await conn.execute("UPDATE users.rounds SET created_at=$2 WHERE id=$1", UUID(first.id), datetime(2026, 1, 1))
        await conn.execute("UPDATE users.rounds SET created_at=$2 WHERE id=$1", UUID(second.id), datetime(2026, 1, 2))
    assert (await database_manager.rounds.get_rounds_for_user(user.id, limit=1))[0].id == second.id
    assert (await database_manager.rounds.get_rounds_for_user(user.id, limit=1, offset=1))[0].id == first.id
    summary = await database_manager.rounds.get_round_summaries_for_user(user.id)
    assert [str(row["id"]) for row in summary] == [second.id, first.id]
    assert (await database_manager.rounds.get_round(first.id)).date == date


async def test_single_slot_pool_loads_and_updates_without_nested_acquisition(postgres_pool):
    database = DatabaseManager(postgres_pool)
    user = await create_user(database, email="pool@example.test")
    course = await make_course(database)
    saved = await database.rounds.create_round(Round(course=course, hole_scores=scores(FULL_ROUND)), user.id)
    # A separate pool uses the same explicitly test-only DSN; never fall back to DATABASE_URL.
    from tests.integration.conftest import _get_test_database_url

    single = await asyncpg.create_pool(dsn=_get_test_database_url(), min_size=1, max_size=1)
    try:
        one_slot = DatabaseManager(single)
        results = await asyncio.wait_for(
            asyncio.gather(*[one_slot.rounds.get_round(saved.id) for _ in range(5)]), timeout=5
        )
        assert all(round_.is_complete() for round_ in results)
        edited = await asyncio.wait_for(one_slot.rounds.update_round(saved.id, notes="one slot"), timeout=5)
        assert edited.notes == "one slot"
    finally:
        await single.close()


async def test_concurrent_token_consumption_and_issuance(database_manager):
    user = await create_user(database_manager, email="tokens@example.test")
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    token = "a" * 64
    await database_manager.users.create_auth_token(user.id, "password_reset", token, expires)
    outcomes = await asyncio.gather(
        *[database_manager.users.consume_auth_token("password_reset", token) for _ in range(5)]
    )
    assert outcomes.count(user.id) == 1
    await asyncio.gather(
        *[database_manager.users.create_auth_token(user.id, "password_reset", char * 64, expires) for char in "bcde"]
    )
    async with database_manager._pool.acquire() as conn:
        assert (
            await conn.fetchval(
                "SELECT COUNT(*) FROM users.auth_tokens WHERE user_id=$1 AND used_at IS NULL", UUID(user.id)
            )
            == 1
        )


async def test_concurrent_gap_filling_is_gap_only(database_manager):
    course = await make_course(database_manager)
    await asyncio.gather(
        *[
            database_manager.courses.fill_course_gaps(
                course.id, [Hole(number=1, par=5)], "White", yardages={1: yardage}
            )
            for yardage in (300, 400, 500)
        ]
    )
    loaded = await database_manager.courses.get_course(course.id)
    assert loaded.get_hole(1).par == 4
    assert len(loaded.tees) == 1
    assert loaded.tees[0].get_hole_yardage(1) in (300, 400, 500)


async def test_course_write_rolls_back_when_later_child_conflicts(database_manager):
    duplicate = TeeRating(hole_numbers=FRONT_NINE, course_rating=26.3)
    with pytest.raises(DuplicateError):
        await make_course(database_manager, tees=[Tee(color="White", ratings=[duplicate, duplicate])])
    async with database_manager._pool.acquire() as conn:
        assert await conn.fetchval("SELECT COUNT(*) FROM courses.courses") == 0
        assert await conn.fetchval("SELECT COUNT(*) FROM courses.tees") == 0


async def test_round_references_reject_foreign_owner_and_wrong_course(database_manager):
    user = await create_user(database_manager, email="owner@example.test")
    other = await create_user(database_manager, email="outsider@example.test")
    course = await create_course(database_manager, name="Private", user_id=other.id)
    with pytest.raises(IntegrityError):
        await database_manager.rounds.create_round(Round(course=course, hole_scores=scores(FRONT_NINE)), user.id)
    tee = await database_manager.user_tees.create_user_tee(UserTee(user_id=other.id, name="Private Tee"))
    with pytest.raises(IntegrityError):
        await database_manager.rounds.create_round(Round(hole_scores=scores(FRONT_NINE)), user.id, user_tee_id=tee.id)


async def test_round_rejects_a_tee_from_another_course(database_manager):
    user = await create_user(database_manager, email="golfer@example.test")
    course_a = await create_course(database_manager, name="Course A", external_course_id="course-a")
    course_b = await create_course(database_manager, name="Course B", external_course_id="course-b")
    async with database_manager._pool.acquire() as conn:
        tee_b = await conn.fetchval("SELECT id FROM courses.tees WHERE course_id = $1 LIMIT 1", UUID(str(course_b.id)))

    with pytest.raises(IntegrityError, match="does not belong to the round course"):
        await database_manager.rounds.create_round(
            Round(course=course_a, hole_scores=scores(FULL_ROUND)), user.id, tee_id=str(tee_b)
        )
    assert await database_manager.rounds.get_rounds_for_user(user.id, limit=None) == []


async def test_friendship_block_cannot_be_overwritten_by_stale_accept(database_manager):
    first = await create_user(database_manager, email="first@example.test")
    second = await create_user(database_manager, email="second@example.test")
    request = await database_manager.friendships.send_request(first.id, second.id)
    await asyncio.gather(
        database_manager.friendships.update_status(str(request["id"]), second.id, "accepted"),
        database_manager.friendships.update_status(str(request["id"]), first.id, "blocked"),
    )
    assert not await database_manager.friendships.are_friends(first.id, second.id)
    outsider = await create_user(database_manager, email="third@example.test")
    assert await database_manager.friendships.update_status(str(request["id"]), outsider.id, "accepted") is None
    with pytest.raises(ValueError):
        await database_manager.friendships.update_status(str(request["id"]), outsider.id, "pending")


@pytest.mark.parametrize("value", [float("inf"), float("nan"), 0, -1])
async def test_database_rejects_invalid_published_ratings(database_manager, value):
    course = await make_course(database_manager)
    async with database_manager._pool.acquire() as conn:
        with pytest.raises(asyncpg.CheckViolationError):
            await conn.execute(
                "INSERT INTO courses.tees(course_id,color,course_rating) VALUES($1,$2,$3)",
                UUID(course.id),
                "Bad",
                value,
            )


async def test_legacy_rating_format_is_not_inferred(database_manager):
    course = await make_course(database_manager, tees=[Tee(color="White", course_rating=26.3, slope_rating=80)])
    assert course.get_tee("White").rating_holes is None
    assert course.get_tee("White").get_rating(FRONT_NINE) is None


async def test_round_fallback_uses_persisted_course_but_preserves_accepted_par(database_manager):
    user = await create_user(database_manager, email="snapshot@example.test")
    course = await make_course(database_manager)
    stale_course = course.model_copy(deep=True)
    await database_manager.courses.upsert_hole(course.id, Hole(number=1, par=5, handicap=1))
    saved = await database_manager.rounds.create_round(
        Round(
            course=stale_course,
            intended_holes=FRONT_NINE,
            hole_scores=[HoleScore(hole_number=1, strokes=5), HoleScore(hole_number=2, strokes=5, par_played=3)],
        ),
        user.id,
    )
    assert saved.get_hole_par(1) == 5
    assert saved.get_hole_par(2) == 3
    await database_manager.courses.upsert_hole(course.id, Hole(number=1, par=3, handicap=1))
    loaded = await database_manager.rounds.get_round(saved.id)
    summary = (await database_manager.rounds.get_round_summaries_for_user(user.id))[0]
    assert loaded.get_hole_par(1) == 5
    assert summary["to_par"] == loaded.total_to_par() == 2
    assert summary["course_par"] == loaded.get_par() == 36


async def test_course_id_only_round_derives_nine_hole_completion_from_database(database_manager):
    user = await create_user(database_manager, email="course-id@example.test")
    course = await make_course(database_manager, count=9)
    saved = await database_manager.rounds.create_round(
        Round(hole_scores=scores(FRONT_NINE)),
        user.id,
        course_id=course.id,
    )
    assert saved.is_complete()
    async with database_manager._pool.acquire() as conn:
        assert await conn.fetchval("SELECT is_complete FROM users.rounds WHERE id=$1", UUID(saved.id))
    with pytest.raises(IntegrityError, match="layout"):
        await database_manager.rounds.create_round(Round(hole_scores=scores(BACK_NINE)), user.id, course_id=course.id)


async def test_ambiguous_course_tees_and_outside_layout_holes_are_not_persisted(database_manager):
    with pytest.raises(DuplicateError):
        await make_course(database_manager, tees=[Tee(color="Blue"), Tee(color="blue")])
    with pytest.raises(IntegrityError, match="layout"):
        await database_manager.courses.create_course(
            Course(
                name="Bad Nine",
                total_holes=9,
                holes=[Hole(number=12, par=4)],
            )
        )
    course = await make_course(database_manager, count=9)
    with pytest.raises(IntegrityError, match="layout"):
        await database_manager.courses.upsert_hole(course.id, Hole(number=12, par=4))
    with pytest.raises(IntegrityError, match="layout"):
        await database_manager.courses.fill_course_gaps(course.id, [Hole(number=12, par=4)])
    await database_manager.courses.update_course(course.id, total_holes=18, par=None)
    await database_manager.courses.upsert_hole(course.id, Hole(number=12, par=4))
    with pytest.raises(IntegrityError, match="layout"):
        await database_manager.courses.update_course(course.id, total_holes=9)
    assert (await database_manager.courses.get_course(course.id)).total_holes == 18


async def test_sql_and_model_summaries_ignore_unscored_stats_and_keep_unknowns(database_manager):
    user = await create_user(database_manager, email="observations@example.test")
    course = await make_course(database_manager)
    saved = await database_manager.rounds.create_round(
        Round(
            course=course,
            intended_holes=FRONT_NINE,
            hole_scores=[
                HoleScore(hole_number=1, strokes=4, putts=2, green_in_regulation=True),
                HoleScore(hole_number=2, strokes=5),
                HoleScore(hole_number=3, putts=3, green_in_regulation=False),
            ],
        ),
        user.id,
    )
    summary = (await database_manager.rounds.get_round_summaries_for_user(user.id))[0]
    assert summary["total_score"] == saved.calculate_total_score() == 9
    assert summary["total_putts"] == saved.get_total_putts() is None
    assert summary["total_gir"] == saved.get_total_gir() is None
    assert summary["to_par"] == saved.total_to_par() == 1
    with pytest.raises(IntegrityError):
        await database_manager.rounds.update_hole_scores(
            saved.id,
            [
                HoleScore(hole_number=1, strokes=6),
                HoleScore(hole_number=10, strokes=3),
            ],
        )
    assert (await database_manager.rounds.get_round(saved.id)).get_hole_score(1).strokes == 4


async def test_relink_preserves_par_and_clears_obsolete_hole_and_custom_tee_references(database_manager):
    user = await create_user(database_manager, email="relink@example.test")
    original = await make_course(database_manager)
    replacement = await database_manager.courses.create_course(Course(name="Replacement", total_holes=18))
    tee = await database_manager.user_tees.create_user_tee(UserTee(user_id=user.id, course_id=original.id, name="Blue"))
    saved = await database_manager.rounds.create_round(
        Round(
            course=original,
            user_tee=tee,
            hole_scores=[HoleScore(hole_number=1, strokes=5, par_played=3)],
        ),
        user.id,
    )
    linked = await database_manager.rounds.link_course_to_round(saved.id, replacement.id, user_id=user.id)
    assert linked.course.id == replacement.id and linked.user_tee is None
    assert linked.get_hole_par(1) == 3
    async with database_manager._pool.acquire() as conn:
        assert await conn.fetchval("SELECT hole_id FROM users.hole_scores WHERE round_id=$1", UUID(saved.id)) is None
    outsider = await create_user(database_manager, email="relink-other@example.test")
    assert await database_manager.rounds.update_round(saved.id, user_id=outsider.id) is None
    assert await database_manager.courses.update_course(original.id, user_id=outsider.id) is None


async def test_concurrent_tee_replacements_keep_one_complete_configuration(database_manager):
    course = await make_course(database_manager)
    await asyncio.gather(
        *[
            database_manager.courses.upsert_tee(
                course.id,
                Tee(
                    color=color,
                    hole_yardages={1: yardage},
                    rating_holes=FRONT_NINE,
                    course_rating=rating,
                ),
            )
            for color, yardage, rating in [("Blue", 300, 30.0), ("blue", 400, 31.0)]
        ]
    )
    loaded = await database_manager.courses.get_course(course.id)
    assert len(loaded.tees) == 1
    tee = loaded.tees[0]
    assert (tee.hole_yardages[1], tee.course_rating) in {(300, 30.0), (400, 31.0)}


async def test_course_par_does_not_resurrect_after_clearing_observations(database_manager):
    course = await make_course(database_manager, count=9)
    for number in FRONT_NINE:
        await database_manager.courses.upsert_hole(course.id, Hole(number=number, par=None, handicap=number))
    assert (await database_manager.courses.get_course(course.id)).get_par() is None
    supplied = await database_manager.courses.create_course(Course(name="Supplied par", total_holes=9, par=36))
    await database_manager.courses.fill_course_gaps(supplied.id, [Hole(number=1, par=4)])
    await database_manager.courses.upsert_hole(supplied.id, Hole(number=1, par=None))
    assert (await database_manager.courses.get_course(supplied.id)).get_par() is None


@pytest.mark.parametrize("yardages", ['{"1":400,"01":500}', '{"1":true}', '{"1":400.5}', "[]"])
async def test_sql_rejects_invalid_custom_tee_yardages(database_manager, yardages):
    user = await create_user(database_manager, email="json@example.test")
    async with database_manager._pool.acquire() as conn:
        with pytest.raises(asyncpg.CheckViolationError):
            await conn.execute(
                "INSERT INTO users.user_tees(user_id,name,hole_yardages) VALUES($1,$2,$3)",
                UUID(user.id),
                "Bad JSON",
                yardages,
            )


async def test_legacy_spaced_email_is_resolved_consistently(database_manager):
    user = await create_user(database_manager, email="spaced@example.test")
    async with database_manager._pool.acquire() as conn:
        await conn.execute("UPDATE users.users SET email=$2 WHERE id=$1", UUID(user.id), " SPACED@EXAMPLE.TEST ")
    assert (await database_manager.users.get_user_by_email("spaced@example.test")).id == user.id
    assert (await database_manager.users.get_auth_user_by_email(" SPACED@example.test "))["id"] == user.id
    assert await database_manager.users.get_password_hash("spaced@example.test") == "test-password-hash"


async def test_token_expiry_and_recent_issuance_use_utc_even_in_non_utc_session(postgres_pool):
    from database.repositories.user_repo import UserRepositoryDB
    from tests.integration.conftest import _get_test_database_url

    user = await create_user(DatabaseManager(postgres_pool), email="timezone@example.test")
    local = await asyncpg.create_pool(
        dsn=_get_test_database_url(),
        min_size=1,
        max_size=1,
        server_settings={"timezone": "Pacific/Honolulu"},
    )
    try:
        repository = UserRepositoryDB(local)
        now = datetime.now(timezone.utc)
        await repository.create_auth_token(user.id, "password_reset", "f" * 64, now + timedelta(hours=1))
        assert await repository.has_recent_auth_token(user.id, "password_reset", now - timedelta(minutes=1))
        assert await repository.consume_auth_token("password_reset", "f" * 64) == user.id
        await repository.create_auth_token(user.id, "password_reset", "e" * 64, now - timedelta(hours=1))
        assert await repository.consume_auth_token("password_reset", "e" * 64) is None
    finally:
        await local.close()
