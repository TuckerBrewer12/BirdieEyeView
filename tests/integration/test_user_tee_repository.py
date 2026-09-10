import pytest

from database.exceptions import DuplicateError, NotFoundError
from tests.integration.helpers import (
    create_course,
    create_user,
    create_user_tee,
)


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def _create_owned_tee(database_manager):
    owner = await create_user(database_manager, email="tee-owner@example.com")
    course = await create_course(database_manager, name="Tee Integration")
    user_tee = await create_user_tee(
        database_manager,
        user_id=owner.id,
        course_id=course.id,
    )
    return owner, course, user_tee


async def test_create_user_tee_round_trips_jsonb_yardages(database_manager):
    _, _, user_tee = await _create_owned_tee(database_manager)

    assert user_tee.hole_yardages == {1: 415, 2: 390, 18: 445}


async def test_list_user_tees_filters_by_course(database_manager):
    owner, course, user_tee = await _create_owned_tee(database_manager)

    listed = await database_manager.user_tees.get_user_tees(
        owner.id,
        course_id=course.id,
    )

    assert [listed_tee.id for listed_tee in listed] == [user_tee.id]


async def test_get_user_tee_is_owner_scoped(database_manager):
    _, _, user_tee = await _create_owned_tee(database_manager)
    other_user = await create_user(database_manager, email="tee-other@example.com")

    result = await database_manager.user_tees.get_user_tee(
        user_tee.id,
        user_id=other_user.id,
    )

    assert result is None


async def test_update_user_tee_persists_fields_and_yardages(database_manager):
    owner, _, user_tee = await _create_owned_tee(database_manager)

    updated = await database_manager.user_tees.update_user_tee(
        user_tee.id,
        user_id=owner.id,
        name="Updated Combo",
        slope_rating=129,
        hole_yardages={1: 420, 18: 450},
    )

    assert (updated.name, updated.slope_rating) == ("Updated Combo", 129.0)
    assert updated.hole_yardages == {1: 420, 18: 450}


async def test_update_user_tee_rejects_other_owner(database_manager):
    _, _, user_tee = await _create_owned_tee(database_manager)
    other_user = await create_user(database_manager, email="tee-other@example.com")

    with pytest.raises(NotFoundError):
        await database_manager.user_tees.update_user_tee(
            user_tee.id,
            user_id=other_user.id,
            name="Not Allowed",
        )


async def test_duplicate_user_tee_name_raises_duplicate_error(database_manager):
    owner, course, user_tee = await _create_owned_tee(database_manager)

    with pytest.raises(DuplicateError):
        await create_user_tee(
            database_manager,
            user_id=owner.id,
            course_id=course.id,
            name=user_tee.name,
        )


async def test_delete_user_tee_is_owner_scoped(database_manager):
    owner, _, user_tee = await _create_owned_tee(database_manager)
    other_user = await create_user(database_manager, email="tee-other@example.com")

    deleted_by_other = await database_manager.user_tees.delete_user_tee(
        user_tee.id,
        user_id=other_user.id,
    )
    deleted_by_owner = await database_manager.user_tees.delete_user_tee(
        user_tee.id,
        user_id=owner.id,
    )

    assert deleted_by_other is False
    assert deleted_by_owner is True
