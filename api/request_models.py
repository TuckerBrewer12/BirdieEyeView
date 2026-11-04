"""Typed Pydantic request/input models shared across API routers.

Every request body the API accepts is defined here. Class and field names are part of the public
OpenAPI contract (the frontend generates its types from it), so keep them stable.
"""

from datetime import datetime
from typing import Annotated, Dict, Iterable, List, Optional
from uuid import UUID

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator, model_validator

from api.input_validation import (
    ensure_uuid_str,
    normalize_course_display_name,
    normalize_handicap_value,
    sanitize_user_text,
)
from models.hole_layout import FRONT_NINE, FULL_ROUND
from services.scan_normalization import normalize_decimal, normalize_whole_number


def whole_number_field(value, info):
    # Lax int parsing would read True as one stroke; reject non-numeric representations first.
    return normalize_whole_number(value, info.field_name)


def decimal_field(value, info):
    return normalize_decimal(value, info.field_name)


def sanitized_text(field_name: str, max_length: int, *, allow_newlines: bool = False) -> AfterValidator:
    """Shared rule for free-text request fields: ``sanitize_user_text`` under the field's own name.

    Used inside ``Annotated``; ``None`` on an optional field never reaches it.
    """

    def check(value: str) -> str:
        return sanitize_user_text(value, field_name=field_name, max_length=max_length, allow_newlines=allow_newlines)

    return AfterValidator(check)


MAX_HOLE_YARDAGE = 1_000
# Matches models.tee.CourseRating: any positive finite rating, so nine-hole ratings such as 35.0 pass.
COURSE_RATING = Field(default=None, gt=0, allow_inf_nan=False)
SLOPE_RATING = Field(default=None, ge=55, le=155, allow_inf_nan=False)

# Free-text fields shared by more than one request.
TeeBox = Annotated[str, sanitized_text("tee_box", 40)]
Notes = Annotated[str, sanitized_text("notes", 2_000, allow_newlines=True)]
ExternalCourseId = Annotated[str, sanitized_text("external_course_id", 100)]
CourseName = Annotated[str, sanitized_text("name", 140), AfterValidator(normalize_course_display_name)]
CourseLocation = Annotated[str, sanitized_text("location", 140)]
UserTeeName = Annotated[str, sanitized_text("name", 60)]


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


# ================================================================
# Holes, tees and scores
# ================================================================


class HoleScoreInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hole_number: int = Field(..., ge=1, le=18)
    strokes: Optional[int] = Field(default=None, ge=1, le=15)
    putts: Optional[int] = Field(default=None, ge=0, le=10)
    shots_to_green: Optional[int] = Field(default=None, ge=1, le=10)
    fairway_hit: Optional[bool] = None
    green_in_regulation: Optional[bool] = None
    par_played: Optional[int] = Field(default=None, ge=3, le=6)
    handicap_played: Optional[int] = Field(default=None, ge=1, le=18)

    _normalize_numbers = field_validator(
        "hole_number", "strokes", "putts", "shots_to_green", "par_played", "handicap_played",
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


# Editing a hole accepts exactly what saving one does.
HoleScoreUpdate = HoleScoreInput


class TeeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    color: Annotated[str, sanitized_text("tee color", 40)] = Field(..., min_length=1, max_length=40)
    slope_rating: Optional[float] = SLOPE_RATING
    course_rating: Optional[float] = COURSE_RATING
    hole_yardages: Dict[str, int] = Field(default_factory=dict)

    _normalize_ratings = field_validator("slope_rating", "course_rating", mode="before")(decimal_field)
    _normalize_yardages = field_validator("hole_yardages", mode="before")(_string_keyed_yardages)


class CourseHoleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hole_number: int = Field(..., ge=1, le=18)
    par: Optional[int] = Field(default=None, ge=3, le=6)
    handicap: Optional[int] = Field(default=None, ge=1, le=18)

    _normalize_numbers = field_validator("hole_number", "par", "handicap", mode="before")(whole_number_field)


# ================================================================
# Scan save
# ================================================================


class SaveRoundRequest(BaseModel):
    """Request to save a reviewed/edited round."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    user_id: str = ""  # populated from JWT by the endpoint; ignored if sent by client
    course_id: Optional[str] = None   # explicit DB course id — skips fuzzy match when provided
    external_course_id: Optional[ExternalCourseId] = Field(default=None, max_length=100)
    course_name: Optional[
        Annotated[str, sanitized_text("course_name", 140), AfterValidator(normalize_course_display_name)]
    ] = None
    course_location: Optional[Annotated[str, sanitized_text("course_location", 140)]] = None
    tee_box: Optional[TeeBox] = None
    tee_slope_rating: Optional[float] = SLOPE_RATING
    tee_course_rating: Optional[float] = COURSE_RATING
    tee_yardages: Optional[Dict[str, int]] = None
    all_tees: Optional[List[TeeInput]] = None
    hole_scores: List[HoleScoreInput] = Field(..., min_length=1, max_length=18)
    course_holes: Optional[List[CourseHoleInput]] = None
    date: Optional[str] = None
    notes: Optional[Notes] = None

    _normalize_ratings = field_validator("tee_slope_rating", "tee_course_rating", mode="before")(decimal_field)
    _normalize_yardages = field_validator("tee_yardages", mode="before")(_string_keyed_yardages)

    @field_validator("course_id")
    @classmethod
    def _validate_course_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return ensure_uuid_str(v, "course_id")

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

    @model_validator(mode="after")
    def _validate_hole_rows(self):
        # The database stores 1-18 holes played per round; a round with no score has none.
        if not any(h.strokes is not None for h in self.hole_scores):
            raise ValueError("Enter a score for at least one hole.")
        hole_nums = [h.hole_number for h in self.hole_scores]
        if len(set(hole_nums)) != len(hole_nums):
            raise ValueError("hole_scores cannot contain duplicate hole_number values.")
        holes = self.course_holes or []
        reject_duplicate_course_entries(
            (h.hole_number for h in holes), (h.handicap for h in holes), (t.color for t in self.all_tees or [])
        )
        return self


# ================================================================
# Courses
# ================================================================


class HoleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number: int = Field(..., ge=1, le=18)
    par: Optional[int] = Field(default=None, ge=3, le=6)
    handicap: Optional[int] = Field(default=None, ge=1, le=18)

    _normalize_numbers = field_validator("number", "par", "handicap", mode="before")(whole_number_field)


class CreateCourseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: CourseName = Field(..., min_length=1, max_length=140)
    external_course_id: Optional[ExternalCourseId] = Field(default=None, max_length=100)
    location: Optional[CourseLocation] = None
    holes: List[HoleInput] = Field(default_factory=list, max_length=18)
    tees: List[TeeInput] = Field(default_factory=list, max_length=12)

    @model_validator(mode="after")
    def _validate_course_structure(self):
        reject_duplicate_course_entries(
            (h.number for h in self.holes), (h.handicap for h in self.holes), (t.color for t in self.tees)
        )
        numbers = tuple(sorted(h.number for h in self.holes))
        # The database stores a 9- or 18-hole layout; a partial hole list has neither.
        if numbers and numbers not in (FRONT_NINE, FULL_ROUND):
            raise ValueError("Course holes must be holes 1-9 or 1-18.")
        return self


class UpdateCourseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: Optional[CourseName] = None
    external_course_id: Optional[ExternalCourseId] = None
    location: Optional[CourseLocation] = None
    # Same bounds as models.course.Course and the database: 3-6 per hole for 9 or 18 holes.
    par: Optional[int] = Field(default=None, ge=27, le=108)

    _normalize_par = field_validator("par", mode="before")(whole_number_field)

    @model_validator(mode="after")
    def _reject_null_name(self):
        # name is required on a course; location and the provider ID may be cleared with null.
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("name cannot be null.")
        return self


# ================================================================
# Rounds
# ================================================================


class UpdateRoundRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    hole_scores: Optional[List[HoleScoreUpdate]] = Field(default=None, max_length=18)
    notes: Optional[Notes] = None
    weather_conditions: Optional[Annotated[str, sanitized_text("weather_conditions", 200)]] = None
    tee_box: Optional[TeeBox] = None
    course_name_played: Optional[Annotated[str, sanitized_text("course_name_played", 255)]] = None

    @model_validator(mode="after")
    def _validate_unique_holes(self):
        if self.hole_scores:
            holes = [h.hole_number for h in self.hole_scores]
            if len(set(holes)) != len(holes):
                raise ValueError("hole_scores cannot contain duplicate hole_number values.")
        return self


class LinkCourseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    course_id: UUID


# ================================================================
# Users, user tees and friends
# ================================================================


class CreateUserTeeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    course_id: Optional[UUID] = None
    name: UserTeeName = Field(..., min_length=1, max_length=60)
    slope_rating: Optional[float] = SLOPE_RATING
    course_rating: Optional[float] = COURSE_RATING
    hole_yardages: Optional[dict] = None

    _normalize_ratings = field_validator("slope_rating", "course_rating", mode="before")(decimal_field)

    @field_validator("hole_yardages", mode="before")
    @classmethod
    def _validate_hole_yardages(cls, value: object) -> Optional[dict]:
        return normalize_hole_yardages(value)


class UpdateUserTeeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: Optional[UserTeeName] = None
    slope_rating: Optional[float] = SLOPE_RATING
    course_rating: Optional[float] = COURSE_RATING
    hole_yardages: Optional[dict] = None

    _normalize_ratings = field_validator("slope_rating", "course_rating", mode="before")(decimal_field)

    @field_validator("hole_yardages", mode="before")
    @classmethod
    def _validate_hole_yardages(cls, value: object) -> Optional[dict]:
        return normalize_hole_yardages(value)


class UpdateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    home_course_id: Optional[UUID] = None
    handicap: Optional[float] = Field(default=None, ge=-10, le=54)
    # Same bounds as models.user.User: 18-hole goal 18-270, nine-hole goal 9-135.
    scoring_goal: Optional[int] = Field(default=None, strict=True, ge=18, le=270)
    scoring_goal_nine: Optional[int] = Field(default=None, strict=True, ge=9, le=135)

    @field_validator("handicap", mode="before")
    @classmethod
    def _normalize_handicap(cls, v: object) -> object:
        return normalize_handicap_value(v)


class SendFriendRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    addressee_user_id: Optional[UUID] = None
    addressee_friend_code: Optional[str] = Field(default=None, min_length=4, max_length=24)

    @field_validator("addressee_friend_code")
    @classmethod
    def _validate_friend_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        code = sanitize_user_text(v, field_name="addressee_friend_code", max_length=24).upper()
        if not code.replace("-", "").isalnum():
            raise ValueError("addressee_friend_code must be alphanumeric.")
        return code

    @model_validator(mode="after")
    def _validate_target_selector(self):
        if self.addressee_user_id and self.addressee_friend_code:
            raise ValueError("Provide either addressee_user_id or addressee_friend_code, not both.")
        if not self.addressee_user_id and not self.addressee_friend_code:
            raise ValueError("Provide addressee_friend_code or addressee_user_id.")
        return self


class FriendshipStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = Field(..., pattern="^(accepted|declined|blocked)$")
