import math
import re
from typing import Any, Optional

_WHOLE_NUMBER_TEXT = re.compile(r"([+-]?\d+)(\.0+)?")
_MAX_DIGITS = 6
_DECIMAL_TEXT = re.compile(r"[+-]?(\d+(\.\d*)?|\.\d+)")


class ScanValueError(ValueError):
    ...


def normalize_whole_number(value: Any, field: str) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ScanValueError(f"{field} must be a number, not true/false")
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not math.isfinite(value) or not value.is_integer():
            raise ScanValueError(f"{field} must be a whole number")
        return int(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        match = _WHOLE_NUMBER_TEXT.fullmatch(text)
        if not match:
            raise ScanValueError(f"{field} must be a whole number")
        digits = match.group(1)
        if len(digits.lstrip("+-")) > _MAX_DIGITS:
            raise ScanValueError(f"{field} is out of range")
        return int(digits)
    raise ScanValueError(f"{field} must be a whole number")


def normalize_decimal(value: Any, field: str) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ScanValueError(f"{field} must be a number, not true/false")
    try:
        if isinstance(value, (int, float)):
            number = float(value)
        elif isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            if not _DECIMAL_TEXT.fullmatch(text):
                raise ScanValueError(f"{field} must be a number")
            number = float(text)
        else:
            raise ScanValueError(f"{field} must be a number")
    except OverflowError as error:
        # float() of a huge int raises OverflowError, which validation would not catch.
        raise ScanValueError(f"{field} is out of range") from error
    if not math.isfinite(number):
        raise ScanValueError(f"{field} must be a finite number")
    return number
