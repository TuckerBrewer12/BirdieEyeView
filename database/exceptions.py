class DatabaseError(Exception):
    """Base for all database errors."""


class NotFoundError(DatabaseError):
    """Entity not found."""


class DuplicateError(DatabaseError):
    """Unique constraint violation."""


class IntegrityError(DatabaseError):
    """Foreign key or check constraint violation."""


class AlreadyFriendsError(DuplicateError):
    """A friend request between two golfers who are already friends."""


class FriendRequestBlockedError(DuplicateError):
    """A friend request between two golfers when one has blocked the other."""
