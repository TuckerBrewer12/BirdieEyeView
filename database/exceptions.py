class DatabaseError(Exception):
    pass


class NotFoundError(DatabaseError):
    pass


class DuplicateError(DatabaseError):
    pass


class IntegrityError(DatabaseError):
    pass


class AlreadyFriendsError(DuplicateError):
    """A friend request between two golfers who are already friends."""


class FriendRequestBlockedError(DuplicateError):
    """A friend request between two golfers when one has blocked the other."""
