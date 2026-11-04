"""Typed Pydantic request/input models shared across API routers."""

from datetime import datetime
from typing import Dict, Iterable, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from api.input_validation import ensure_uuid_str, normalize_course_display_name, sanitize_user_text
from services.scan_normalization import normalize_decimal, normalize_whole_number


def whole_number_field(value, info):
    # Lax int parsing would read True as one stroke; reject non-numeric representations first.
    return normalize_whole_number(value, info.field_name)


def decimal_field(value, info):
    return normalize_decimal(value, info.field_name)


MAX_HOLE_YARDAGE = 1_000
# Matches models.tee.CourseRating: any positive finite rating, so nine-hole ratings such as 35.0 pass.
COURSE_RATING = Field(default=None, gt=0, allow_inf_nan=False)
SLOPE_RATING = Field(default=None, ge=55, le=155, allow_inf_nan=False)


def normalize_hole_yardages(value, field: str = "hole_yardages") -> Optional[Dict[int, int]]:
    """Shared request rule for every per-hole yardage map.

    Keys are hole numbers 1-18 (``1``, ``"1"`` and ``"01"`` are the same hole, and a map naming a
    hole twice is rejected rather than silently keeping one value). Values are whole yards 0-1,000.
    Unknown (``null``) entries are omitted, the domain's representation of an unknown yardage.
    """
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field} must map hole numbers to yards.")
    out: Dict[int, int] = {}
    seen = set()
    for raw_hole, raw_yards in value.items():
        hole = normalize_whole_number(raw_hole, f"{field} hole number")
        if hole is None or not 1 <= hole <= 18:
            raise ValueError(f"{field} hole number must be between 1 and 18.")
        if hole in seen:
            raise ValueError(f"{field} lists hole {hole} more than once.")
        seen.add(hole)
        yards = normalize_whole_number(raw_yards, f"{field}[{hole}]")
        if yards is None:
            continue
        if not 0 <= yards <= MAX_HOLE_YARDAGE:
            raise ValueError(f"{field} value must be between 0 and {MAX_HOLE_YARDAGE}.")
        out[hole] = yards
    return out


def _string_keyed_yardages(value, info):
    yardages = normalize_hole_yardages(value, info.field_name)
    return None if yardages is None else {str(hole): yards for hole, yards in yardages.items()}


def reject_duplicate_course_entries(
    hole_numbers: Iterable[int], handicaps: Iterable[Optional[int]], tee_colors: Iterable[str]
) -> None:
    """Course rows the database keeps unique: hole numbers, handicap ranks and tee names (any case)."""
    numbers = list(hole_numbers)
    if len(set(numbers)) != len(numbers):
        raise ValueError("Course holes cannot repeat a hole number.")
    ranks = [rank for rank in handicaps if rank is not None]
    if len(set(ranks)) != len(ranks):
        raise ValueError("Course holes cannot repeat a handicap rank.")
    colors = [color.casefold() for color in tee_colors]
    if len(set(colors)) != len(colors):
        raise ValueError("Each tee needs a different name.")


class HoleScoreInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hole_number: int = Field(..., ge=1, le=18)
    strokes: Optional[int] = Field(default=None, ge=1, le=15)
    putts: Optional[int] = Field(default=None, ge=0, le=10)
    net_score: Optional[int] = None
    shots_to_green: Optional[int] = Field(default=None, ge=1, le=10)
    fairway_hit: Optional[bool] = None
    green_in_regulation: Optional[bool] = None
    par_played: Optional[int] = Field(default=None, ge=3, le=6)
    handicap_played: Optional[int] = Field(default=None, ge=1, le=18)

    _normalize_numbers = field_validator(
        "hole_number", "strokes", "putts", "net_score", "shots_to_green", "par_played", "handicap_played",
        mode="before",
    )(whole_number_field)

    @model_validator(mode="after")
    def _validate_parts_vs_strokes(self):
        if self.strokes is not None:
            if self.putts is not None and self.putts > self.strokes:
                raise ValueError("putts cannot exceed strokes.")
            if self.shots_to_green is not None and self.shots_to_green > self.strokes:
                raise ValueError("shots_to_green cannot exceed strokes.")
        return self


class TeeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    color: str = Field(..., min_length=1, max_length=40)
    slope_rating: Optional[float] = SLOPE_RATING
    course_rating: Optional[float] = COURSE_RATING
    hole_yardages: Dict[str, int] = Field(default_factory=dict)

    _normalize_ratings = field_validator("slope_rating", "course_rating", mode="before")(decimal_field)
    _normalize_yardages = field_validator("hole_yardages", mode="before")(_string_keyed_yardages)

    @field_validator("color")
    @classmethod
    def _validate_color(cls, v: str) -> str:
        return sanitize_user_text(v, field_name="tee color", max_length=40)


class CourseHoleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hole_number: int = Field(..., ge=1, le=18)
    par: Optional[int] = Field(default=None, ge=3, le=6)
    handicap: Optional[int] = Field(default=None, ge=1, le=18)

    _normalize_numbers = field_validator("hole_number", "par", "handicap", mode="before")(whole_number_field)


class SaveRoundRequest(BaseModel):
    """Request to save a reviewed/edited round."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    user_id: str = ""  # populated from JWT by the endpoint; ignored if sent by client
    course_id: Optional[str] = None   # explicit DB course id — skips fuzzy match when provided
    external_course_id: Optional[str] = Field(default=None, max_length=100)
    course_name: Optional[str] = None
    course_location: Optional[str] = None
    tee_box: Optional[str] = None
    tee_slope_rating: Optional[float] = SLOPE_RATING
    tee_course_rating: Optional[float] = COURSE_RATING
    tee_yardages: Optional[Dict[str, int]] = None
    all_tees: Optional[List[TeeInput]] = None
    hole_scores: List[HoleScoreInput] = Field(..., min_length=1, max_length=18)
    course_holes: Optional[List[CourseHoleInput]] = None
    date: Optional[str] = None
    notes: Optional[str] = None

    _normalize_ratings = field_validator("tee_slope_rating", "tee_course_rating", mode="before")(decimal_field)
    _normalize_yardages = field_validator("tee_yardages", mode="before")(_string_keyed_yardages)

    @field_validator("course_id")
    @classmethod
    def _validate_course_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return ensure_uuid_str(v, "course_id")

    @field_validator("external_course_id")
    @classmethod
    def _validate_external_course_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_user_text(
            v, field_name="external_course_id", max_length=100, allow_newlines=False
        )

    @field_validator("course_name")
    @classmethod
    def _validate_course_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        sanitized = sanitize_user_text(v, field_name="course_name", max_length=140)
        return normalize_course_display_name(sanitized)

    @field_validator("course_location")
    @classmethod
    def _validate_course_location(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_user_text(v, field_name="course_location", max_length=140)

    @field_validator("tee_box")
    @classmethod
    def _validate_tee_box(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_user_text(v, field_name="tee_box", max_length=40)

    @field_validator("date")
    @classmethod
    def _validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        try:
            datetime.fromisoformat(v)
        except ValueError as exc:
            raise ValueError("date must be a valid ISO-8601 datetime/date string.") from exc
        return v

    @field_validator("notes")
    @classmethod
    def _validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_user_text(v, field_name="notes", max_length=2_000, allow_newlines=True)

    @model_validator(mode="after")
    def _validate_hole_rows(self):
        hole_nums = [h.hole_number for h in self.hole_scores]
        if len(set(hole_nums)) != len(hole_nums):
            raise ValueError("hole_scores cannot contain duplicate hole_number values.")
        holes = self.course_holes or []
        reject_duplicate_course_entries(
            (h.hole_number for h in holes), (h.handicap for h in holes), (t.color for t in self.all_tees or [])
        )
        return self
