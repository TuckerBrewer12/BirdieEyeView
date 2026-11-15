class DatabaseError(Exception):
    ...


class NotFoundError(DatabaseError):
    ...


class DuplicateError(DatabaseError):
    ...


class IntegrityError(DatabaseError):
    ...


class ConflictError(IntegrityError):
    ...


class FriendRequestBlockedError(DuplicateError):
    ...


class AlreadyFriendsError(DuplicateError):
    ...
