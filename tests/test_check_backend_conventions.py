from __future__ import annotations

import sys
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CI_SCRIPTS = ROOT / "scripts" / "ci"
if str(CI_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(CI_SCRIPTS))

from check_backend_conventions import check_source


def lines(source: str) -> list[int]:
    return [lineno for lineno, _ in check_source(textwrap.dedent(source))]


# --- exception text in HTTPException detail ---------------------------------


@pytest.mark.parametrize(
    "raise_line",
    [
        "raise HTTPException(422, str(exc))",
        "raise HTTPException(status_code=500, detail=str(exc))",
        'raise HTTPException(500, f"Save failed: {exc}")',
        'raise HTTPException(500, detail=f"Save failed: {exc!r}")',
        "raise HTTPException(500, detail=repr(exc.args[0]))",
        'raise fastapi.HTTPException(500, detail={"error": str(exc)})',
        "raise HTTPException(500, str(exc)) from exc",
    ],
)
def test_flags_exception_text_in_detail(raise_line):
    source = f"""
    try:
        save()
    except Exception as exc:
        {raise_line}
    """
    assert lines(source) == [5]


def test_flags_outer_exception_inside_nested_handler():
    source = """
    try:
        save()
    except ValueError as outer:
        try:
            rollback()
        except Exception:
            raise HTTPException(500, str(outer))
    """
    assert lines(source) == [8]


@pytest.mark.parametrize(
    "raise_line",
    [
        'raise HTTPException(500, "Could not save the round.")',
        "raise HTTPException(exc.status_code, detail=exc.detail)",
        "raise HTTPException(500, detail=GENERIC_ERROR) from exc",
        'raise HTTPException(404, f"Round {round_id} not found")',
    ],
)
def test_allows_fixed_messages(raise_line):
    source = f"""
    try:
        save()
    except Exception as exc:
        {raise_line}
    """
    assert lines(source) == []


def test_ignores_str_of_same_name_outside_except():
    source = """
    def f(exc):
        raise HTTPException(400, str(exc))
    """
    assert lines(source) == []


# --- hard-coded hole counts --------------------------------------------------


@pytest.mark.parametrize(
    "snippet",
    [
        "is_complete = holes_played == 18",
        "ok = len(self.holes) != 18",
        "ok = 1 <= hole_num <= 18",
        "ok = len(front) < 9",
        "ok = round.hole_count >= 18",
        "hole_count = 18",
        "num_holes: int = 9",
        "xs = [i for i in range(1, 19)]",
        "xs = [i for i in range(10, 19)]",
        "xs = [i for i in range(18)]",
    ],
)
def test_flags_hard_coded_hole_counts(snippet):
    assert lines(snippet) == [1]


@pytest.mark.parametrize(
    "snippet",
    [
        "ok = handicap <= 18",
        "ok = holes_played == HOLES_PER_ROUND",
        "ok = len(xs) > 10",
        "ok = score >= 9",
        "xs = range(1, 6)",
        "xs = range(0, 18, 2)",
        "xs = range(n)",
        "max_retries = 9",
    ],
)
def test_allows_unrelated_numbers(snippet):
    assert lines(snippet) == []
