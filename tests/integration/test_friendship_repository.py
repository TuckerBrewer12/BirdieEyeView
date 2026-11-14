import pytest

from database.exceptions import DuplicateError
from tests.integration.helpers import create_user


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def _create_friendship_users(database_manager):
    requester = await create_user(
        database_manager,
        email="requester@example.com",
        name="Requesting Golfer",
    )
    addressee = await create_user(
        database_manager,
        email="addressee@example.com",
        name="Receiving Golfer",
    )
    return requester, addressee


async def _create_pending_friendship(database_manager):
    requester, addressee = await _create_friendship_users(database_manager)
    friendship = await database_manager.friendships.send_request(
        requester.id,
        addressee.id,
    )
    return requester, addressee, friendship


async def test_send_request_creates_pending_friendship(database_manager):
    requester, addressee = await _create_friendship_users(database_manager)

    friendship = await database_manager.friendships.send_request(
        requester.id,
        addressee.id,
    )

    assert friendship["status"] == "pending"
    assert (str(friendship["requester_id"]), str(friendship["addressee_id"])) == (
        requester.id,
        addressee.id,
    )


async def test_pending_friendship_is_not_accepted(database_manager):
    requester, addressee, _ = await _create_pending_friendship(database_manager)

    are_friends = await database_manager.friendships.are_friends(
        requester.id,
        addressee.id,
    )

    assert are_friends is False


async def test_list_friendships_includes_user_details(database_manager):
    _, addressee, _ = await _create_pending_friendship(database_manager)

    friendships = await database_manager.friendships.list_for_user(
        addressee.id,
        status="pending",
    )

    assert friendships[0]["requester_name"] == "Requesting Golfer"
    assert friendships[0]["addressee_email"] == "addressee@example.com"


async def _accept_friendship(database_manager):
    requester, addressee, friendship = await _create_pending_friendship(database_manager)
    accepted = await database_manager.friendships.update_status(
        str(friendship["id"]),
        addressee.id,
        "accepted",
    )
    return requester, addressee, accepted


async def test_accept_friendship_updates_status(database_manager):
    _, _, accepted = await _accept_friendship(database_manager)

    assert accepted["status"] == "accepted"


async def test_accepted_friendship_is_undirected(database_manager):
    requester, addressee, _ = await _accept_friendship(database_manager)

    assert await database_manager.friendships.are_friends(requester.id, addressee.id)
    assert await database_manager.friendships.are_friends(addressee.id, requester.id)


async def test_accepted_friendship_rejects_reverse_duplicate(database_manager):
    requester, addressee, friendship = await _create_pending_friendship(database_manager)
    await database_manager.friendships.update_status(
        str(friendship["id"]),
        addressee.id,
        "accepted",
    )

    with pytest.raises(DuplicateError):
        await database_manager.friendships.send_request(addressee.id, requester.id)


async def test_send_request_rejects_self_friendship(database_manager):
    requester = await create_user(database_manager, email="requester@example.com")

    with pytest.raises(ValueError, match="yourself"):
        await database_manager.friendships.send_request(requester.id, requester.id)


async def test_blocked_friendship_is_not_accepted(database_manager):
    requester, addressee, friendship = await _create_pending_friendship(database_manager)

    blocked = await database_manager.friendships.update_status(
        str(friendship["id"]),
        requester.id,
        "blocked",
    )

    assert blocked["status"] == "blocked"
    assert not await database_manager.friendships.are_friends(requester.id, addressee.id)
