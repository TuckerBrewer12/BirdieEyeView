import pytest

from database.exceptions import DuplicateError
from models import Course, Hole, Tee
from models.hole_layout import FRONT_NINE, FULL_ROUND
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

    results = await database_manager.courses.search_course_summaries("Monterey")

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

    owner_courses = await database_manager.courses.list_course_summaries(user_id=owner.id)
    other_courses = await database_manager.courses.list_course_summaries(user_id=other_user.id)

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


async def _unrated_course(database_manager):
    user = await create_user(database_manager, email="gaps@example.com")
    return await database_manager.courses.create_course(
        Course(
            name="Gap Links",
            total_holes=18,
            holes=[Hole(number=n, par=4, handicap=n) for n in FULL_ROUND],
            tees=[Tee(color="Blue", hole_yardages={n: 400 for n in FULL_ROUND})],
        ),
        user_id=user.id,
    )


async def _blue(database_manager, course):
    return (await database_manager.courses.get_course(course.id)).get_tee("Blue")


async def test_gap_fill_puts_a_course_layout_rating_on_the_tee_with_its_coverage(database_manager):
    course = await _unrated_course(database_manager)

    await database_manager.courses.fill_course_gaps(course.id, [], "Blue", 125, 71.2, rating_holes=FULL_ROUND)

    blue = await _blue(database_manager, course)
    assert (blue.course_rating, blue.slope_rating, blue.rating_holes, blue.ratings) == (71.2, 125.0, FULL_ROUND, [])


async def test_gap_fill_keeps_a_nine_hole_rating_beside_the_tee_and_never_overwrites(database_manager):
    course = await _unrated_course(database_manager)
    fill = database_manager.courses.fill_course_gaps

    await fill(course.id, [], "Blue", 118, 35.2, rating_holes=FRONT_NINE)
    await fill(course.id, [], "Blue", 120, 36.0, rating_holes=FRONT_NINE)
    blue = await _blue(database_manager, course)
    assert (blue.course_rating, blue.slope_rating, blue.rating_holes) == (None, None, None)

    await fill(course.id, [], "Blue", 125, 71.2, rating_holes=FULL_ROUND)
    await fill(course.id, [], "Blue", 130, 73.0, rating_holes=FULL_ROUND)
    blue = await _blue(database_manager, course)
    assert (blue.course_rating, blue.slope_rating, blue.rating_holes) == (71.2, 125.0, FULL_ROUND)
    assert [(r.hole_numbers, r.course_rating, r.slope_rating) for r in blue.ratings] == [(FRONT_NINE, 35.2, 118.0)]


async def test_gap_fill_without_coverage_keeps_the_whole_layout_reading(database_manager):
    course = await _unrated_course(database_manager)

    await database_manager.courses.fill_course_gaps(course.id, [], "Blue", 125, 71.2)

    blue = await _blue(database_manager, course)
    assert (blue.course_rating, blue.slope_rating, blue.rating_holes, blue.ratings) == (71.2, 125.0, None, [])


async def test_gap_fill_creates_a_new_tee_with_only_its_nine_hole_rating(database_manager):
    course = await _unrated_course(database_manager)

    await database_manager.courses.fill_course_gaps(course.id, [], "Gold", 118, 35.2, rating_holes=FRONT_NINE)

    gold = (await database_manager.courses.get_course(course.id)).get_tee("Gold")
    assert (gold.course_rating, gold.slope_rating, gold.rating_holes) == (None, None, None)
    assert [(r.hole_numbers, r.course_rating, r.slope_rating) for r in gold.ratings] == [(FRONT_NINE, 35.2, 118.0)]


async def test_gap_fill_on_a_course_without_a_known_layout_records_the_coverage(database_manager):
    user = await create_user(database_manager, email="no-layout@example.com")
    course = await database_manager.courses.create_course(
        Course(name="Twelve Holes", holes=[Hole(number=n, par=4) for n in range(1, 13)],
               tees=[Tee(color="Blue", hole_yardages={n: 400 for n in range(1, 13)})]),
        user_id=user.id,
    )

    await database_manager.courses.fill_course_gaps(course.id, [], "Blue", 118, 35.2, rating_holes=FRONT_NINE)

    blue = await _blue(database_manager, course)
    assert (course.total_holes, blue.course_rating, blue.slope_rating, blue.rating_holes, blue.ratings) == (
        None, 35.2, 118.0, FRONT_NINE, []
    )
