class DatabaseError(Exception):
    ...


class NotFoundError(DatabaseError):
    ...


class DuplicateError(DatabaseError):
    ...


class IntegrityError(DatabaseError):
    ...


class AlreadyFriendsError(DuplicateError):
    ...


class FriendRequestBlockedError(DuplicateError):
    ...
