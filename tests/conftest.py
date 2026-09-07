import pytest

from tests.helpers import make_asyncpg_pool


@pytest.fixture
def mock_pool():
    return make_asyncpg_pool()
