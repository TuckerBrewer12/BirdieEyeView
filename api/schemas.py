"""API-specific response models for list views and aggregated data."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Dict, List, Literal, Optional

from models import Hole, UserTee
from models.hole_score import ScoreKind


class ResponseModel(BaseModel):
    # A field with a default is always present in the response, so the API schema marks it required.
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)


class ScoreCounts(ResponseModel):
    """How many holes landed in each score bucket."""
    eagle: int = 0
    birdie: int = 0
    par: int = 0
    bogey: int = 0
    double: int = 0
    triple: int = 0
    quad: int = 0


class TeeResponse(ResponseModel):
    """A tee with its yardage figures worked out."""
    color: Optional[str] = None
    slope_rating: Optional[float] = None
    course_rating: Optional[float] = None
    hole_yardages: Dict[int, int] = Field(default_factory=dict)
    total_yardage: Optional[int] = None       # stored, else the sum of the holes
    front_nine_yardage: Optional[int] = None  # null until all nine holes have a yardage
    back_nine_yardage: Optional[int] = None


class CourseResponse(ResponseModel):
    """A full course, with the figures the Course model works out."""
    id: Optional[str] = None
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    location: Optional[str] = None
    user_id: Optional[str] = None
    par: Optional[int] = None             # stored, else the sum of all 18 holes
    front_nine_par: Optional[int] = None  # null until all nine holes have a par
    back_nine_par: Optional[int] = None
    holes: List[Hole] = Field(default_factory=list)
    tees: List[TeeResponse] = Field(default_factory=list)


class HoleScoreResponse(ResponseModel):
    """One hole as played, with its par resolved and how it scored."""
    hole_number: int
    strokes: Optional[int] = None
    net_score: Optional[int] = None
    putts: Optional[int] = None
    shots_to_green: Optional[int] = None
    fairway_hit: Optional[bool] = None
    green_in_regulation: Optional[bool] = None
    par_played: Optional[int] = None
    handicap_played: Optional[int] = None
    par: Optional[int] = None  # the course's par for the hole, else par_played
    to_par: Optional[int] = None
    kind: Optional[ScoreKind] = None


class RoundFigures(ResponseModel):
    """What a round's hole scores add up to. Computed by the Round model, never stored."""
    total_score: Optional[int] = None
    par: Optional[int] = None
    to_par: Optional[int] = None
    front_nine: Optional[int] = None  # null until all nine holes are scored
    back_nine: Optional[int] = None   # null until all nine holes are scored
    total_putts: Optional[int] = None
    total_gir: Optional[int] = None
    fairways_hit: Optional[int] = None
    score_counts: ScoreCounts = Field(default_factory=ScoreCounts)


class RoundSummaryResponse(RoundFigures):
    """A round for list views: where and when, its figures, and its hole scores."""
    id: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    course_location: Optional[str] = None
    course_par: Optional[int] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None
    hole_scores: List[HoleScoreResponse] = Field(default_factory=list)


class RoundResponse(RoundFigures):
    """A full round: the stored round, its figures, and its hole scores."""
    id: Optional[str] = None
    course: Optional[CourseResponse] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    weather_conditions: Optional[str] = None
    notes: Optional[str] = None
    course_name_played: Optional[str] = None
    user_tee: Optional[UserTee] = None
    hole_scores: List[HoleScoreResponse] = Field(default_factory=list)


class ScoreMix(ResponseModel):
    """Percent of classified holes in each score bucket."""
    eagle: float = 0.0
    birdie: float = 0.0
    par: float = 0.0
    bogey: float = 0.0
    double: float = 0.0
    triple: float = 0.0
    quad: float = 0.0


class RecentForm(ResponseModel):
    """Rates over the last five rounds, pooled by chances. Null when there is nothing to measure."""
    gir_pct: Optional[float] = None
    scrambling_pct: Optional[float] = None
    up_and_down_pct: Optional[float] = None
    putts_per_18: Optional[float] = None


class HandicapChange(ResponseModel):
    delta: Optional[float] = None  # change over the last six rated rounds
    direction: Optional[Literal["up", "down", "flat"]] = None  # over the window; under 0.3 is flat


class WhsRound(ResponseModel):
    round_index: int
    course_name: Optional[str] = None
    course_rating: Optional[float] = None
    slope_rating: Optional[float] = None
    score: Optional[int] = None
    differential: Optional[float] = None
    used: bool = False


class WhsBreakdown(ResponseModel):
    """The rounds in the handicap window, newest first, and which differentials count."""
    rows: List[WhsRound] = Field(default_factory=list)
    window_size: int = 0
    count_used: int = 0
    adjustment: float = 0.0
    diff_avg: Optional[float] = None
    has_rated_rounds: bool = False
    show_calculation: bool = False


class Milestone(ResponseModel):
    """A lifetime best. `value` is the score, the putt threshold, or the streak length."""
    kind: Literal["under_par", "score_break", "putt_break", "par_streak"]
    value: int
    date: str
    course: str
    round_id: Optional[str] = None


class DashboardResponse(ResponseModel):
    """Aggregated stats for the dashboard page. Every figure is worked out here, not on the client."""
    total_rounds: int
    scoring_average: Optional[float] = None
    best_round: Optional[int] = None
    best_round_id: Optional[str] = None
    best_round_course: Optional[str] = None
    handicap_index: Optional[float] = None
    recent_rounds: List[RoundSummaryResponse]
    average_putts: Optional[float] = None
    average_gir: Optional[float] = None
    # Over the last 20 rounds, the window the dashboard's charts show.
    scoring_average_l20: Optional[float] = None
    scoring_average_l5: Optional[float] = None
    handicap_change: HandicapChange = Field(default_factory=HandicapChange)
    recent_form: RecentForm = Field(default_factory=RecentForm)
    score_mix: ScoreMix = Field(default_factory=ScoreMix)
    recent_score_mix: ScoreMix = Field(default_factory=ScoreMix)
    score_mix_holes: int = 0
    milestones: List[Milestone] = Field(default_factory=list)
    whs: WhsBreakdown = Field(default_factory=WhsBreakdown)


class CourseSummaryResponse(ResponseModel):
    """Course for card/list views."""
    id: str
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    source: str = "local"
    location: Optional[str] = None
    par: Optional[int] = None
    total_holes: int = 0
    tee_count: int = 0


class AIComparisonItem(ResponseModel):
    metric: str
    category: str           # "Ball Striking" | "Short Game" | "Putting"
    player_value: Optional[float] = None
    benchmark_value: float
    unit: str               # "%" | " strokes" | " putts"
    lower_is_better: bool
    has_data: bool


class AIInsightItem(ResponseModel):
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


class AIStrengthItem(ResponseModel):
    category: str
    title: str
    metric_label: str
    player_value: float
    benchmark_value: float
    margin_description: str


class AISuggestionsResponse(ResponseModel):
    user_id: str
    handicap_index: Optional[float] = None
    handicap_range_label: str
    insights: List[AIInsightItem]
    strengths: List[AIStrengthItem]
    comparisons: List[AIComparisonItem]
    rounds_analyzed: int
    generated_at: str
