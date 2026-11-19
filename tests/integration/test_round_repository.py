from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from models import HoleScore, Round
from tests.integration.helpers import (
    create_course,
    create_round,
    create_user,
    make_complete_scores,
)


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def _create_linked_round(database_manager):
    user = await create_user(database_manager, email="round-owner@example.com")
    course = await create_course(
        database_manager,
        name="Round Integration",
        external_course_id="round-integration-1",
    )
    saved_round = await create_round(
        database_manager,
        user_id=user.id,
        course=course,
    )
    return user, course, saved_round


async def test_create_round_reassembles_course_and_scores(database_manager):
    _, course, saved_round = await _create_linked_round(database_manager)

    assert saved_round.course.id == course.id
    assert len(saved_round.hole_scores) == 18


async def test_create_round_backfills_par_from_course(database_manager):
    _, _, saved_round = await _create_linked_round(database_manager)

    assert all(score.par_played == 4 for score in saved_round.hole_scores)


async def test_round_summary_aggregates_hole_scores(database_manager):
    user, _, _ = await _create_linked_round(database_manager)

    summaries = await database_manager.rounds.get_round_summaries_for_user(user.id)

    summary = summaries[0]
    assert (
        summary.calculate_total_score(),
        summary.get_total_putts(),
        summary.calculate_front_nine(),
        summary.calculate_back_nine(),
    ) == (72, 36, 36, 36)
    assert len(summary.hole_scores) == 18


async def test_round_summary_reports_completeness_and_format(database_manager):
    user, course, _ = await _create_linked_round(database_manager)
    await database_manager.rounds.create_round(
        Round(
            course=course,
            date=datetime(2026, 9, 8, tzinfo=timezone.utc),
            hole_scores=[HoleScore(hole_number=n, strokes=4) for n in range(1, 4)],
        ),
        user.id,
    )

    summaries = await database_manager.rounds.get_round_summaries_for_user(user.id, limit=None)

    assert [(row.is_complete(), len(row.get_intended_holes())) for row in summaries] == [(False, 18), (True, 18)]


async def test_rounds_without_a_limit_return_the_full_history(database_manager):
    user, course, _ = await _create_linked_round(database_manager)
    for day in range(2, 24):
        await database_manager.rounds.create_round(
            Round(course=course, date=datetime(2026, 1, day, tzinfo=timezone.utc), hole_scores=make_complete_scores()),
            user.id,
        )

    rounds = await database_manager.rounds.get_rounds_for_user(user.id, limit=None)

    assert len(rounds) == 23


async def test_get_rounds_for_user_filters_by_course(database_manager):
    user, course, saved_round = await _create_linked_round(database_manager)

    rounds = await database_manager.rounds.get_rounds_for_user(
        user.id,
        course_id=course.id,
    )

    assert [round_.id for round_ in rounds] == [saved_round.id]


async def test_edit_recalculates_the_stored_total(database_manager):
    user, _, saved_round = await _create_linked_round(database_manager)

    edited = await database_manager.rounds.edit_round(
        saved_round.id, user_id=user.id, hole_changes={1: {"strokes": 5, "putts": 2}}, fields={}
    )

    assert edited.get_hole_score(1).strokes == 5
    assert edited.calculate_total_score() == 73
    async with database_manager._pool.acquire() as conn:
        stored = await conn.fetchval("SELECT total_score FROM users.rounds WHERE id = $1", UUID(saved_round.id))
    assert stored == 73


async def _create_unlinked_round(database_manager):
    user = await create_user(database_manager, email="round-owner@example.com")
    course = await create_course(database_manager, name="Round Integration")
    unlinked_round = await database_manager.rounds.create_round(
        Round(
            tee_box="Blue",
            course_name_played="Unlinked Integration",
            date=datetime(2026, 9, 6, tzinfo=timezone.utc),
            hole_scores=make_complete_scores(),
        ),
        user.id,
    )
    return user, course, unlinked_round


async def test_link_course_to_round_replaces_display_course_name(database_manager):
    user, course, unlinked_round = await _create_unlinked_round(database_manager)

    linked_round = await database_manager.rounds.link_course_to_round(
        unlinked_round.id,
        course.id,
        user_id=user.id,
    )

    assert linked_round.course.id == course.id
    assert linked_round.course_name_played is None


async def test_link_course_to_round_backfills_hole_metadata(database_manager):
    user, course, unlinked_round = await _create_unlinked_round(database_manager)

    linked_round = await database_manager.rounds.link_course_to_round(
        unlinked_round.id,
        course.id,
        user_id=user.id,
    )

    assert all(score.par_played == 4 for score in linked_round.hole_scores)
    assert all(score.handicap_played is not None for score in linked_round.hole_scores)


async def test_delete_round_removes_owned_round(database_manager):
    user, _, saved_round = await _create_linked_round(database_manager)

    deleted = await database_manager.rounds.delete_round(
        saved_round.id,
        user_id=user.id,
    )

    assert deleted is True
    assert await database_manager.rounds.get_round(saved_round.id) is None


async def test_round_owner_lookup(database_manager):
    user, _, saved_round = await _create_linked_round(database_manager)
    lookup = database_manager.rounds.get_round_owner_id

    assert await lookup(str(saved_round.id)) == str(user.id)
    assert await lookup(str(uuid4())) is None
    assert await lookup("not-a-uuid") is None


async def test_played_courses_are_distinct_owner_scoped_and_ordered(database_manager):
    user = await create_user(database_manager, email="played@example.com")
    other = await create_user(database_manager, email="played-other@example.com")
    master = await create_course(database_manager, name="Same Name", external_course_id="played-master")
    copy = await create_course(database_manager, name="Same Name", external_course_id="played-copy", user_id=user.id)
    alpha = await create_course(database_manager, name="Alpha Links", external_course_id="played-alpha", user_id=user.id)
    theirs = await create_course(database_manager, name="Theirs", external_course_id="played-theirs", user_id=other.id)
    for course in (master, master, copy, alpha):
        await create_round(database_manager, user_id=user.id, course=course)
    await create_round(database_manager, user_id=other.id, course=theirs)

    played = await database_manager.rounds.get_played_courses_for_user(str(user.id))

    assert [course["id"] for course in played] == [str(alpha.id), *sorted([str(master.id), str(copy.id)])]
