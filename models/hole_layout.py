"""Canonical hole coverage; entry counts alone never establish a nine-hole format."""
from typing import Annotated

from pydantic import BeforeValidator

FRONT_NINE = tuple(range(1, 10))
BACK_NINE = tuple(range(10, 19))
FULL_ROUND = tuple(range(1, 19))


def validate_coverage(value) -> tuple[int, ...]:
    if not isinstance(value, (list, tuple)) or any(type(n) is not int for n in value):
        raise ValueError('Hole coverage must contain integer hole numbers')
    numbers = tuple(sorted(value))
    if numbers not in (FRONT_NINE, BACK_NINE, FULL_ROUND):
        raise ValueError('Hole coverage must be exactly 1–9, 10–18, or 1–18')
    return numbers


HoleCoverage = Annotated[tuple[int, ...], BeforeValidator(validate_coverage)]
