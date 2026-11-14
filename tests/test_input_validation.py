from uuid import uuid4

import pytest

from api.input_validation import (
    ensure_uuid_str,
    normalize_email,
    normalize_handicap_value,
    sanitize_ocr_text,
    sanitize_search_query,
    sanitize_user_text,
)


def test_ensure_uuid_normalizes_case():
    value = str(uuid4())

    assert ensure_uuid_str(value.upper(), "id") == value


@pytest.mark.parametrize(
    ("call", "expected"),
    [
        (lambda: normalize_email("  Golfer@Example.COM "), "golfer@example.com"),
        (
            lambda: sanitize_user_text(
                "  A\r\nName  ",
                field_name="name",
                max_length=30,
            ),
            "A  Name",
        ),
        (
            lambda: sanitize_user_text(
                "line one\r\nline two",
                field_name="notes",
                max_length=30,
                allow_newlines=True,
            ),
            "line one\nline two",
        ),
        (
            lambda: sanitize_user_text(
                "",
                field_name="optional",
                max_length=10,
                allow_empty=True,
            ),
            "",
        ),
        (lambda: sanitize_search_query("Pebble Beach"), "Pebble Beach"),
        (lambda: sanitize_ocr_text("one\r\ntwo"), "one\ntwo"),
    ],
)
def test_input_sanitizer_accepts_valid_value(call, expected):
    assert call() == expected


@pytest.mark.parametrize(
    ("call", "message"),
    [
        (lambda: ensure_uuid_str("nope", "course_id"), "valid UUID"),
        (lambda: normalize_email("not-an-email"), "Invalid email"),
        (
            lambda: sanitize_user_text("", field_name="name", max_length=5),
            "cannot be empty",
        ),
        (
            lambda: sanitize_user_text("123456", field_name="name", max_length=5),
            "at most 5",
        ),
        (
            lambda: sanitize_user_text("bad\x01", field_name="name", max_length=10),
            "control",
        ),
        (
            lambda: sanitize_user_text("<b>x</b>", field_name="name", max_length=20),
            "HTML",
        ),
        (lambda: sanitize_search_query("x UNION SELECT y"), "unsafe"),
        (lambda: sanitize_ocr_text("1234", max_length=3), "maximum size"),
        (lambda: sanitize_ocr_text("bad\x02"), "control"),
    ],
)
def test_input_validator_rejects_invalid_value(call, message):
    with pytest.raises(ValueError, match=message):
        call()


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, None),
        (" ", None),
        ("+3.2", -3.2),
        ("12.4", "12.4"),
        (-2.0, -2.0),
    ],
)
def test_normalize_handicap_accepts_supported_value(value, expected):
    assert normalize_handicap_value(value) == expected


@pytest.mark.parametrize("value", ["+", "+bad"])
def test_normalize_handicap_rejects_invalid_value(value):
    with pytest.raises(ValueError, match="Invalid handicap"):
        normalize_handicap_value(value)
