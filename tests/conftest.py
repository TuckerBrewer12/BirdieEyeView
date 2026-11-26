import os

import pytest
from hypothesis import settings

from tests.helpers import make_asyncpg_pool

settings.register_profile("ci", derandomize=True, print_blob=True)
settings.load_profile("ci" if os.environ.get("CI") else "default")


@pytest.fixture
def mock_pool():
    return make_asyncpg_pool()
