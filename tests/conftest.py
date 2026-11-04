import os

import pytest
from hypothesis import settings

from tests.helpers import make_asyncpg_pool

# Property tests (Hypothesis): in CI, run a fixed set of examples so a red build reproduces
# exactly on re-run; locally, explore new random cases each time.
settings.register_profile("ci", derandomize=True, print_blob=True)
settings.load_profile("ci" if os.environ.get("CI") else "default")


@pytest.fixture
def mock_pool():
    return make_asyncpg_pool()
