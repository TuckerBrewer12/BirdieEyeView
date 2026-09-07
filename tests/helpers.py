from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from starlette.requests import Request


def make_http_request(
    path: str = "/api/test",
    *,
    method: str = "GET",
    scheme: str = "http",
    headers: list[tuple[bytes, bytes]] | None = None,
    cookies: str | None = None,
    app=None,
    client: tuple[str, int] | None = ("127.0.0.1", 1234),
    server: tuple[str, int] = ("localhost", 80),
) -> Request:
    raw_headers = list(headers or [])
    if cookies:
        raw_headers.append((b"cookie", cookies.encode()))
    return Request(
        {
            "type": "http",
            "method": method,
            "scheme": scheme,
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": raw_headers,
            "client": client,
            "server": server,
            "app": app or SimpleNamespace(state=SimpleNamespace()),
        }
    )


def make_async_repo(**return_values):
    return SimpleNamespace(
        **{
            name: AsyncMock(return_value=value)
            for name, value in return_values.items()
        }
    )


def make_mock_database(**repositories):
    defaults = {
        name: make_async_repo()
        for name in ("courses", "rounds", "users", "user_tees", "friendships")
    }
    defaults.update(repositories)
    return SimpleNamespace(**defaults)


def make_asyncpg_pool():
    pool = MagicMock()
    connection = AsyncMock()
    pool.acquire.return_value.__aenter__.return_value = connection
    connection.transaction = MagicMock()
    connection.transaction.return_value.__aenter__.return_value = AsyncMock()
    return pool, connection
