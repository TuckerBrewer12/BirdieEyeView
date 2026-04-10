import pytest
from pydantic import ValidationError

from api.auth_schemas import RegisterRequest
from api.routers.users import UpdateUserRequest
from models import User


def test_user_model_handicap_requires_positive_values():
    assert User(handicap=5.1).handicap == 5.1
    with pytest.raises(ValidationError):
        User(handicap=0)
    with pytest.raises(ValidationError):
        User(handicap=-2.5)


def test_register_schema_accepts_plus_prefixed_handicap():
    req = RegisterRequest(
        name="Test User",
        email="test@example.com",
        password="Password123!",
        handicap="+5.2",
    )
    assert req.handicap == 5.2


def test_register_schema_rejects_non_positive_handicap():
    with pytest.raises(ValidationError):
        RegisterRequest(
            name="Test User",
            email="test@example.com",
            password="Password123!",
            handicap=0,
        )
    with pytest.raises(ValidationError):
        RegisterRequest(
            name="Test User",
            email="test@example.com",
            password="Password123!",
            handicap=-3.2,
        )


def test_update_user_schema_rejects_non_positive_handicap():
    with pytest.raises(ValidationError):
        UpdateUserRequest(handicap=0)
    with pytest.raises(ValidationError):
        UpdateUserRequest(handicap=-4)
    assert UpdateUserRequest(handicap=6.8).handicap == 6.8
