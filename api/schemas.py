"""API-specific response models for list views and aggregated data."""

from datetime import datetime
from pydantic import BaseModel, model_validator
from typing import Any, Dict, List, Optional, Tuple


class RoundSummaryResponse(BaseModel):
    """Lightweight round for list views."""
    id: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    course_location: Optional[str] = None
    course_par: Optional[int] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    total_score: Optional[int] = None
    to_par: Optional[int] = None
    front_nine: Optional[int] = None
    back_nine: Optional[int] = None
    total_putts: Optional[int] = None
    total_gir: Optional[int] = None
    fairways_hit: Optional[int] = None
    notes: Optional[str] = None
    hole_scores_summary: Optional[List[Any]] = None


class DashboardResponse(BaseModel):
    """Aggregated stats for the dashboard page."""
    total_rounds: int
    scoring_average: Optional[float] = None
    best_round: Optional[int] = None
    best_round_id: Optional[str] = None
    best_round_course: Optional[str] = None
    handicap_index: Optional[float] = None
    recent_rounds: List[RoundSummaryResponse]
    average_putts: Optional[float] = None
    average_gir: Optional[float] = None
    # Round totals are by format: the fields above come from complete 18-hole rounds, these from
    # complete nine-hole rounds (never doubled).
    scoring_average_nine: Optional[float] = None
    best_round_nine: Optional[int] = None
    best_round_nine_id: Optional[str] = None
    best_round_nine_course: Optional[str] = None
    average_putts_nine: Optional[float] = None
    average_gir_nine: Optional[float] = None


class CourseSummaryResponse(BaseModel):
    """Course for card/list views."""
    id: str
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    source: str = "local"
    location: Optional[str] = None
    par: Optional[int] = None
    total_holes: int = 0
    tee_count: int = 0


class AIComparisonItem(BaseModel):
    metric: str
    category: str           # "Ball Striking" | "Short Game" | "Putting"
    player_value: Optional[float] = None
    benchmark_value: float
    unit: str               # "%" | " strokes" | " putts"
    lower_is_better: bool
    has_data: bool


class AIInsightItem(BaseModel):
    category: str
    category_group: str  # "Ball Striking" | "Short Game" | "Putting" | "Mental"
    title: str
    description: str
    priority_score: float  # 0–10
    key_metric: Optional[float] = None
    metric_label: str
    benchmark: Optional[float] = None
    trend_direction: str  # "improving" | "declining" | "stable"
    drill_tips: List[str]
    what_if: Optional[str] = None


class AIStrengthItem(BaseModel):
    category: str
    title: str
    metric_label: str
    player_value: float
    benchmark_value: float
    margin_description: str


class AISuggestionsResponse(BaseModel):
    user_id: str
    handicap_index: Optional[float] = None
    handicap_range_label: str
    insights: List[AIInsightItem]
    strengths: List[AIStrengthItem]
    comparisons: List[AIComparisonItem]
    rounds_analyzed: int
    generated_at: str


# ================================================================
# Resource responses
#
# These declare exactly the fields the round, course, user and user-tee endpoints returned when
# they still sent domain models directly, so a new domain field no longer reaches the public
# JSON without a deliberate change here.
# ================================================================


class DomainResponse(BaseModel):
    """Builds from a domain model's serialized form, not its attributes.

    Domain serializers compute values such as course par, round totals and tee total yardage;
    reading attributes instead (FastAPI's default for a returned model) would send their stored,
    often empty, values.
    """

    @model_validator(mode="before")
    @classmethod
    def _serialize_domain_model(cls, value: Any) -> Any:
        if isinstance(value, BaseModel) and not isinstance(value, DomainResponse):
            return value.model_dump()
        return value


class HoleResponse(DomainResponse):
    number: Optional[int] = None
    par: Optional[int] = None
    handicap: Optional[int] = None


class TeeRatingResponse(DomainResponse):
    hole_numbers: Tuple[int, ...]
    course_rating: Optional[float] = None
    slope_rating: Optional[float] = None


class TeeDataResponse(DomainResponse):
    total_yardage: Optional[int] = None
    hole_yardages: Dict[int, int] = {}
    yardage_holes: Optional[Tuple[int, ...]] = None
    course_rating: Optional[float] = None
    slope_rating: Optional[float] = None
    rating_holes: Optional[Tuple[int, ...]] = None
    ratings: List[TeeRatingResponse] = []


class TeeResponse(TeeDataResponse):
    color: Optional[str] = None


class UserTeeResponse(TeeDataResponse):
    id: Optional[str] = None
    user_id: str
    course_id: Optional[str] = None
    name: str
    created_at: Optional[datetime] = None


class CourseResponse(DomainResponse):
    id: Optional[str] = None
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    location: Optional[str] = None
    total_holes: Optional[int] = None
    par: Optional[int] = None
    holes: List[HoleResponse] = []
    tees: List[TeeResponse] = []
    user_id: Optional[str] = None


class HoleScoreResponse(DomainResponse):
    hole_number: Optional[int] = None
    strokes: Optional[int] = None
    net_score: Optional[int] = None
    played: Optional[bool] = None
    putts: Optional[int] = None
    shots_to_green: Optional[int] = None
    fairway_hit: Optional[bool] = None
    green_in_regulation: Optional[bool] = None
    par_played: Optional[int] = None
    handicap_played: Optional[int] = None


class RoundResponse(DomainResponse):
    id: Optional[str] = None
    course: Optional[CourseResponse] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    hole_scores: List[HoleScoreResponse] = []
    intended_holes: Optional[Tuple[int, ...]] = None
    weather_conditions: Optional[str] = None
    notes: Optional[str] = None
    course_name_played: Optional[str] = None
    user_tee: Optional[UserTeeResponse] = None
    total_putts: Optional[int] = None
    total_gir: Optional[int] = None


class UserResponse(DomainResponse):
    id: Optional[str] = None
    friend_code: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    email_verified: bool = False
    email_verified_at: Optional[datetime] = None
    home_course_id: Optional[str] = None
    handicap: Optional[float] = None
    rounds: List[RoundResponse] = []
    created_at: Optional[datetime] = None
    last_handicap_update: Optional[datetime] = None
    scoring_goal: Optional[int] = None
    scoring_goal_nine: Optional[int] = None


# ================================================================
# Scan and friendship responses
# ================================================================


class ScanResponse(BaseModel):
    """Response from scorecard extraction."""
    round: dict
    confidence: dict
    fields_needing_review: list


class FriendshipResponse(BaseModel):
    id: str
    requester_id: str
    addressee_id: str
    status: str
    created_at: str
    updated_at: str
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    addressee_name: Optional[str] = None
    addressee_email: Optional[str] = None
