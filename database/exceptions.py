class DatabaseError(Exception):
    ...


class NotFoundError(DatabaseError):
    ...


class DuplicateError(DatabaseError):
    ...


class IntegrityError(DatabaseError):
    ...


class DuplicateProviderIdError(DuplicateError):
    ...


class ConflictError(IntegrityError):
    ...


class FriendRequestBlockedError(DuplicateError):
    ...


class AlreadyFriendsError(DuplicateError):
    ...


class RequestAlreadySentError(DuplicateError):
    ...


class RequestAwaitingYouError(DuplicateError):
    ...


class YouBlockedError(DuplicateError):
    ...
