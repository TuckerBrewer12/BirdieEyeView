class DatabaseError(Exception):
    pass


class NotFoundError(DatabaseError):
    pass


class DuplicateError(DatabaseError):
    pass


class IntegrityError(DatabaseError):
    pass
