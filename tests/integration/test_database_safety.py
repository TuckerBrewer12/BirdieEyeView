import pytest

from tests.integration.conftest import _get_test_database_url


pytestmark = pytest.mark.integration


def test_database_url_does_not_fall_back_to_application_database(monkeypatch):
    monkeypatch.delenv("TEST_DATABASE_URL", raising=False)
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://production.example.com/golf_scorecard",
    )

    with pytest.raises(pytest.fail.Exception, match="DATABASE_URL is intentionally ignored"):
        _get_test_database_url()


@pytest.mark.parametrize(
    "database_url",
    [
        "postgresql://localhost/golf_scorecard",
        "postgresql://localhost/production",
        "mysql://localhost/golf_scorecard_test",
    ],
)
def test_database_url_rejects_unsafe_targets(monkeypatch, database_url):
    monkeypatch.setenv("TEST_DATABASE_URL", database_url)

    with pytest.raises(pytest.fail.Exception):
        _get_test_database_url()


@pytest.mark.parametrize(
    "database_name",
    ["golf_scorecard_test", "test_golf_scorecard"],
)
def test_database_url_accepts_explicit_test_database_names(monkeypatch, database_name):
    database_url = f"postgresql://localhost/{database_name}"
    monkeypatch.setenv("TEST_DATABASE_URL", database_url)

    assert _get_test_database_url() == database_url
