import pytest

from database.exceptions import DuplicateError
from models import Hole, Tee
from tests.integration.helpers import create_course, create_user


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_create_course_persists_holes_and_tee_yardages(database_manager):
    course = await create_course(database_manager)

    assert len(course.holes) == 18
    assert course.get_tee("blue").hole_yardages[18] == 440


async def test_find_course_by_name_matches_exact_and_fuzzy_names(database_manager):
    course = await create_course(
        database_manager,
        name="Pebble Integration",
        location="Monterey, CA",
    )

    exact = await database_manager.courses.find_course_by_name(
        "PEBBLE INTEGRATION",
        "monterey, ca",
    )
    fuzzy = await database_manager.courses.find_course_by_name("Pebble Integrtion")

    assert exact.id == course.id
    assert fuzzy.id == course.id


async def test_search_courses_matches_location(database_manager):
    course = await create_course(
        database_manager,
        name="Pebble Integration",
        location="Monterey, CA",
    )

    results = await database_manager.courses.search_courses("Monterey")

    assert [result.id for result in results] == [course.id]


async def test_user_course_lookup_is_owner_scoped(database_manager):
    owner = await create_user(database_manager, email="course-owner@example.com")
    other_user = await create_user(database_manager, email="other-owner@example.com")
    custom_course = await create_course(
        database_manager,
        name="Owned Integration",
        user_id=owner.id,
    )

    owner_result = await database_manager.courses.find_user_course_by_name(
        "owned integration",
        "TESTVILLE, CA",
        owner.id,
    )
    other_result = await database_manager.courses.find_user_course_by_name(
        "Owned Integration",
        "Testville, CA",
        other_user.id,
    )

    assert owner_result == custom_course
    assert other_result is None


async def test_list_courses_includes_master_and_owned_courses(database_manager):
    owner = await create_user(database_manager, email="course-owner@example.com")
    other_user = await create_user(database_manager, email="other-owner@example.com")
    master_course = await create_course(database_manager, name="Master Integration")
    custom_course = await create_course(
        database_manager,
        name="Owned Integration",
        external_course_id="owned-course-1",
        user_id=owner.id,
    )

    owner_courses = await database_manager.courses.list_courses(user_id=owner.id)
    other_courses = await database_manager.courses.list_courses(user_id=other_user.id)

    assert {course.id for course in owner_courses} == {master_course.id, custom_course.id}
    assert {course.id for course in other_courses} == {master_course.id}


async def test_upsert_hole_replaces_existing_hole(database_manager):
    course = await create_course(database_manager)

    await database_manager.courses.upsert_hole(
        course.id,
        Hole(number=1, par=5, handicap=1),
    )

    updated_course = await database_manager.courses.get_course(course.id)
    assert updated_course.get_hole(1).par == 5


async def test_upsert_tee_replaces_tee_and_yardages(database_manager):
    course = await create_course(database_manager)

    await database_manager.courses.upsert_tee(
        course.id,
        Tee(
            color="blue",
            slope_rating=130,
            course_rating=73.0,
            hole_yardages={1: 500, 2: 410},
        ),
    )

    updated_tee = (await database_manager.courses.get_course(course.id)).get_tee("Blue")
    assert updated_tee.slope_rating == 130.0
    assert updated_tee.hole_yardages == {1: 500, 2: 410}


async def test_clone_course_copies_children_for_owner(database_manager):
    owner = await create_user(database_manager, email="clone-owner@example.com")
    source = await create_course(database_manager, name="Clone Integration")

    cloned = await database_manager.courses.clone_course(source.id, owner.id)

    assert cloned.user_id == owner.id
    assert cloned.get_tee("Blue").hole_yardages == source.get_tee("Blue").hole_yardages


async def test_duplicate_master_course_raises_duplicate_error(database_manager):
    await create_course(
        database_manager,
        name="Pebble Integration",
        location="Monterey, CA",
    )

    with pytest.raises(DuplicateError):
        await create_course(
            database_manager,
            name="PEBBLE INTEGRATION",
            location="monterey, ca",
            external_course_id="duplicate-master",
        )


async def test_delete_course_is_owner_scoped(database_manager):
    owner = await create_user(database_manager, email="course-owner@example.com")
    other_user = await create_user(database_manager, email="other-owner@example.com")
    custom_course = await create_course(
        database_manager,
        name="Owned Integration",
        user_id=owner.id,
    )

    deleted_by_other = await database_manager.courses.delete_course(
        custom_course.id,
        user_id=other_user.id,
    )
    deleted_by_owner = await database_manager.courses.delete_course(
        custom_course.id,
        user_id=owner.id,
    )

    assert deleted_by_other is False
    assert deleted_by_owner is True
