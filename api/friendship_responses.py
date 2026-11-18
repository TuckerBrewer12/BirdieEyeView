from typing import List, Optional

from api.player_handicap import player_handicap_index_with_rounds
from api.schemas import FriendshipResponse
from database.db_manager import DatabaseManager


def friendship_response(row: dict) -> FriendshipResponse:
    return FriendshipResponse(
        id=str(row["id"]),
        requester_id=str(row["requester_id"]),
        addressee_id=str(row["addressee_id"]),
        status=row["status"],
        created_at=row["created_at"].isoformat() if row.get("created_at") else "",
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else "",
        requester_name=row.get("requester_name"),
        addressee_name=row.get("addressee_name"),
    )


async def _friend_figures(db: DatabaseManager, friend_id: str) -> tuple[Optional[float], Optional[str]]:
    friend = await db.users.get_user(friend_id)
    if friend is None:
        return None, None
    index, rounds = await player_handicap_index_with_rounds(db, friend)
    last = rounds[0].date if rounds and rounds[0].date else None
    return index, last.date().isoformat() if last else None


async def friendship_list(db: DatabaseManager, rows: List[dict], viewer: str) -> List[FriendshipResponse]:
    responses = []
    for row in rows:
        response = friendship_response(row)
        if response.status == "accepted":
            friend_id = response.addressee_id if response.requester_id == viewer else response.requester_id
            index, last_played = await _friend_figures(db, friend_id)
            response = response.model_copy(
                update={"friend_handicap_index": index, "friend_last_played": last_played}
            )
        responses.append(response)
    return responses
