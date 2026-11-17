from datetime import datetime
from typing import Annotated, Dict, Iterable, List, Literal, Optional
from uuid import UUID

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator, model_validator

from api.input_validation import (
    ensure_uuid_str,
    normalize_course_display_name,
    normalize_handicap_value,
    sanitize_user_text,
)
from models import Course, Hole, Tee
from models.hole_layout import FRONT_NINE, FULL_ROUND, rated_coverage
from models.hole import HOLES_PER_ROUND
from services.scan_normalization import normalize_decimal, normalize_whole_number


def whole_number_field(value, info):
    # Lax int parsing would read True as one stroke; reject non-numeric representations first.
    return normalize_whole_number(value, info.field_name)


def decimal_field(value, info):
    return normalize_decimal(value, info.field_name)


def sanitized_text(field_name: str, max_length: int, *, allow_newlines: bool = False) -> AfterValidator:
    def check(value: str) -> str:
        return sanitize_user_text(value, field_name=field_name, max_length=max_length, allow_newlines=allow_newlines)

    return AfterValidator(check)


MAX_HOLE_YARDAGE = 1_000
COURSE_RATING = Field(default=None, gt=0, allow_inf_nan=False)
SLOPE_RATING = Field(default=None, ge=55, le=155, allow_inf_nan=False)

TeeBox = Annotated[str, sanitized_text("tee_box", 40)]
Notes = Annotated[str, sanitized_text("notes", 2_000, allow_newlines=True)]
ExternalCourseId = Annotated[str, sanitized_text("external_course_id", 100)]
CourseName = Annotated[str, sanitized_text("name", 140), AfterValidator(normalize_course_display_name)]
CourseLocation = Annotated[str, sanitized_text("location", 140)]
UserTeeName = Annotated[str, sanitized_text("name", 60)]


def normalize_hole_yardages(value, field: str = "hole_yardages") -> Optional[Dict[int, int]]:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field} must map hole numbers to yards.")
    out: Dict[int, int] = {}
    seen = set()
    for raw_hole, raw_yards in value.items():
        hole = normalize_whole_number(raw_hole, f"{field} hole number")
        if hole is None or not 1 <= hole <= HOLES_PER_ROUND:
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


class SaveRoundRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    user_id: str = ""
    course_id: Optional[str] = None
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
        if numbers and numbers not in (FRONT_NINE, FULL_ROUND):
            raise ValueError("Course holes must be holes 1-9 or 1-18.")
        if numbers and any(int(hole) not in numbers for tee in self.tees for hole in tee.hole_yardages):
            raise ValueError("Tee yardages must be for the course's holes.")
        return self

    def to_course(self) -> Course:
        layout = tuple(sorted(h.number for h in self.holes))
        return Course(
            name=self.name,
            external_course_id=self.external_course_id,
            location=self.location,
            holes=[Hole(number=h.number, par=h.par, handicap=h.handicap) for h in self.holes],
            tees=[
                Tee(
                    color=t.color,
                    slope_rating=t.slope_rating,
                    course_rating=t.course_rating,
                    rating_holes=rated_coverage(layout, t.course_rating, t.slope_rating),
                    hole_yardages={int(hole): yards for hole, yards in t.hole_yardages.items()},
                )
                for t in self.tees
            ],
        )


class UpdateCourseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: Optional[CourseName] = None
    external_course_id: Optional[ExternalCourseId] = None
    location: Optional[CourseLocation] = None
    par: Optional[int] = Field(default=None, ge=27, le=108)

    _normalize_par = field_validator("par", mode="before")(whole_number_field)

    @model_validator(mode="after")
    def _reject_null_name(self):
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("name cannot be null.")
        return self


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
    status: Literal["accepted", "declined", "blocked"]
