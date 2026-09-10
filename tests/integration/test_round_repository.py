import json
from datetime import datetime, timezone

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

    summary_totals = {
        key: summaries[0][key]
        for key in ("total_score", "total_putts", "front_nine", "back_nine")
    }
    assert summary_totals == {
        "total_score": 72,
        "total_putts": 36,
        "front_nine": 36,
        "back_nine": 36,
    }
    assert len(summaries[0]["hole_scores_summary"]) == 18


async def test_get_rounds_for_user_filters_by_course(database_manager):
    user, course, saved_round = await _create_linked_round(database_manager)

    rounds = await database_manager.rounds.get_rounds_for_user(
        user.id,
        course_id=course.id,
    )

    assert [round_.id for round_ in rounds] == [saved_round.id]


async def test_update_hole_scores_recalculates_total(database_manager):
    user, _, saved_round = await _create_linked_round(database_manager)

    updated_round = await database_manager.rounds.update_hole_scores(
        saved_round.id,
        [HoleScore(hole_number=1, strokes=5, putts=2)],
        user_id=user.id,
    )

    assert updated_round.get_hole_score(1).strokes == 5
    assert updated_round.calculate_total_score() == 73


async def test_scan_json_round_trips(database_manager):
    _, _, saved_round = await _create_linked_round(database_manager)

    scan_id = await database_manager.rounds.save_scan(
        round_id=saved_round.id,
        image_path="integration-scorecard.png",
        llm_model="integration-model",
        llm_raw_json={"status": "parsed", "holes": 18},
    )
    scans = await database_manager.rounds.get_scans_for_round(saved_round.id)
    raw_scan_json = scans[0]["llm_raw_json"]
    if isinstance(raw_scan_json, str):
        raw_scan_json = json.loads(raw_scan_json)

    assert str(scans[0]["id"]) == scan_id
    assert raw_scan_json == {"status": "parsed", "holes": 18}


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
