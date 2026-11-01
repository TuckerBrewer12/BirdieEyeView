"""API-specific response models for list views and aggregated data."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Dict, List, Literal, Optional

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
    handicap: Optional[int] = None  # the course's stroke index for the hole, else handicap_played
    yardage: Optional[int] = None  # from the tee played
    to_par: Optional[int] = None
    kind: Optional[ScoreKind] = None


class NineFigures(ResponseModel):
    """What one nine adds up to, for a scorecard's OUT and IN columns. The strokes are front_nine/back_nine."""
    par: Optional[int] = None  # null until every hole has a par
    to_par: Optional[int] = None  # null until the nine is scored and has a par
    putts: Optional[int] = None  # null if any scored hole is missing putts
    gir: Optional[int] = None
    yards: Optional[int] = None  # null until every hole has a yardage


class Nines(ResponseModel):
    front: NineFigures = Field(default_factory=NineFigures)
    back: NineFigures = Field(default_factory=NineFigures)


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
    nines: Nines = Field(default_factory=Nines)
    yards: Optional[int] = None  # the tee played's length
    score_counts: ScoreCounts = Field(default_factory=ScoreCounts)


class HoleSummaryResponse(ResponseModel):
    """One hole in a round list: what was taken and how it scored."""
    hole_number: int
    strokes: Optional[int] = None
    kind: Optional[ScoreKind] = None


class RoundSummaryResponse(ResponseModel):
    """A round for list views: where and when, the figures a list shows, and a mark per hole."""
    id: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    total_score: Optional[int] = None
    to_par: Optional[int] = None
    front_nine: Optional[int] = None  # null until all nine holes are scored
    back_nine: Optional[int] = None   # null until all nine holes are scored
    total_putts: Optional[int] = None
    score_counts: ScoreCounts = Field(default_factory=ScoreCounts)
    hole_scores: List[HoleSummaryResponse] = Field(default_factory=list)


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


DifferentialStatus = Literal["counting", "close", "out", "unrated"]


class ScoreTrendRow(ResponseModel):
    """One round's score, oldest first."""
    round_index: int
    round_id: Optional[str] = None
    total_score: Optional[int] = None
    to_par: Optional[int] = None
    course_name: Optional[str] = None


class HandicapTrendRow(ResponseModel):
    """The handicap index after one round, oldest first, and where its differential stands."""
    round_index: int
    round_id: Optional[str] = None
    handicap_index: Optional[float] = None  # null until there are three rated rounds
    differential: Optional[float] = None
    used_in_hi: Optional[bool] = None  # null without a differential
    hi_threshold: Optional[float] = None  # the highest differential that still counts
    differential_status: DifferentialStatus = "unrated"


class ScramblingTrendRow(ResponseModel):
    """Missed greens saved with par. The percentage is null without a missed green on a linked course."""
    round_index: int
    round_id: Optional[str] = None
    scramble_opportunities: int
    scramble_successes: int
    scramble_failures: int
    scrambling_percentage: Optional[float] = None


class UpAndDownTrendRow(ResponseModel):
    """Missed greens finished in one putt or fewer. The percentage is null without a chance."""
    round_index: int
    round_id: Optional[str] = None
    opportunities: int
    successes: int
    percentage: Optional[float] = None


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
    # L5 minus L20, to a tenth: negative when the recent rounds came in lower.
    scoring_average_change: Optional[float] = None
    handicap_change: HandicapChange = Field(default_factory=HandicapChange)
    recent_form: RecentForm = Field(default_factory=RecentForm)
    score_mix: ScoreMix = Field(default_factory=ScoreMix)
    recent_score_mix: ScoreMix = Field(default_factory=ScoreMix)
    score_mix_holes: int = 0
    milestones: List[Milestone] = Field(default_factory=list)
    whs: WhsBreakdown = Field(default_factory=WhsBreakdown)
    # Per round over the same window, oldest first, for the trend charts.
    score_trend: List[ScoreTrendRow] = Field(default_factory=list)
    handicap_trend: List[HandicapTrendRow] = Field(default_factory=list)
    scrambling_trend: List[ScramblingTrendRow] = Field(default_factory=list)
    up_and_down_trend: List[UpAndDownTrendRow] = Field(default_factory=list)


class AnalyticsKpis(ResponseModel):
    scoring_average: Optional[float] = None
    gir_percentage: Optional[float] = None
    putts_per_gir: Optional[float] = None
    scrambling_percentage: Optional[float] = None  # the average of each round's rate
    up_and_down_percentage: Optional[float] = None
    handicap_index: Optional[float] = None
    total_rounds: int = 0


class NetScoreTrendRow(ResponseModel):
    """Gross less the course handicap the current index gives on the tee played. Null without ratings."""
    round_index: int
    round_id: Optional[str] = None
    gross_score: Optional[int] = None
    course_handicap: Optional[int] = None
    net_score: Optional[int] = None
    course_name: Optional[str] = None
    to_par: Optional[int] = None


class GirTrendRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    total_gir: Optional[int] = None
    holes_played: int
    gir_percentage: Optional[float] = None


class PuttsTrendRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    total_putts: Optional[int] = None
    holes_played: int


class ThreePuttsTrendRow(ResponseModel):
    """Three-putts in a round, as a share of the holes with putts recorded (0 without any)."""
    round_index: int
    round_id: Optional[str] = None
    three_putt_count: int
    holes_with_putt_data: int
    three_putt_percentage: float


class ScoreTypeRow(ResponseModel):
    """Percent of a round's holes in each score type. `par` is the par percentage."""
    round_index: int
    round_id: Optional[str] = None
    holes_counted: int
    eagle: float
    birdie: float
    par: float
    bogey: float
    double_bogey: float
    triple_bogey: float
    quad_bogey: float


class ScoringByParRow(ResponseModel):
    par: int
    average_to_par: float
    average_strokes: float
    sample_size: int


class YardageScore(ResponseModel):
    """One hole played in a yardage bucket."""
    to_par: int
    yardage: int


class ScoringByYardageRow(ResponseModel):
    par: int
    bucket_label: str
    bucket_order: int
    average_to_par: float
    gir_percentage: Optional[float] = None
    sample_size: int
    raw_scores: List[YardageScore] = Field(default_factory=list)


class ScoringByHandicapRow(ResponseModel):
    handicap: int
    average_to_par: float
    sample_size: int


class GirVsNonGirRow(ResponseModel):
    """Percent of GIR (or missed-green) holes in each score type."""
    bucket: Literal["GIR", "No GIR"]
    holes_counted: int
    eagle: float
    birdie: float
    par: float
    bogey: float
    double_bogey: float
    triple_bogey: float
    quad_bogey: float


class ScoreDifferentialRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    score: Optional[int] = None
    course_rating: Optional[float] = None
    slope_rating: Optional[float] = None
    differential: Optional[float] = None


class MilestoneEvent(ResponseModel):
    """The round a record or milestone was set in. `date` reads 2026/5/28."""
    date: str
    course: str
    round_id: Optional[str] = None


class UnderParEvent(MilestoneEvent):
    score: int


class ThresholdMilestone(ResponseModel):
    """The first round to get past `threshold`, or null until one does."""
    threshold: int
    achievement: Optional[MilestoneEvent] = None


class LifetimeScoringRecords(ResponseModel):
    lowest_round: Optional[int] = None
    highest_round: Optional[int] = None
    lowest_9_holes: Optional[int] = None
    most_birdies_in_round: Optional[int] = None
    most_eagles_in_round: Optional[int] = None
    most_gir_in_round: Optional[int] = None
    fewest_putts_in_round: Optional[int] = None


class OneYearScoringRecords(ResponseModel):
    lowest_round: Optional[int] = None
    most_birdies_in_round: Optional[int] = None
    most_gir_in_round: Optional[int] = None
    fewest_putts_in_round: Optional[int] = None


class ScoringRecords(ResponseModel):
    lifetime: LifetimeScoringRecords = Field(default_factory=LifetimeScoringRecords)
    one_year: OneYearScoringRecords = Field(default_factory=OneYearScoringRecords)


class LifetimeScoringRecordEvents(ResponseModel):
    lowest_round: Optional[MilestoneEvent] = None
    highest_round: Optional[MilestoneEvent] = None
    lowest_9_holes: Optional[MilestoneEvent] = None
    most_birdies_in_round: Optional[MilestoneEvent] = None
    most_eagles_in_round: Optional[MilestoneEvent] = None
    most_gir_in_round: Optional[MilestoneEvent] = None
    fewest_putts_in_round: Optional[MilestoneEvent] = None


class OneYearScoringRecordEvents(ResponseModel):
    lowest_round: Optional[MilestoneEvent] = None
    most_birdies_in_round: Optional[MilestoneEvent] = None
    most_gir_in_round: Optional[MilestoneEvent] = None
    fewest_putts_in_round: Optional[MilestoneEvent] = None


class ScoringRecordEvents(ResponseModel):
    lifetime: LifetimeScoringRecordEvents = Field(default_factory=LifetimeScoringRecordEvents)
    one_year: OneYearScoringRecordEvents = Field(default_factory=OneYearScoringRecordEvents)


class LifetimeCareerTotals(ResponseModel):
    total_rounds_played: int = 0
    total_holes_played: int = 0
    total_birdies: int = 0
    total_eagles: int = 0
    total_hole_in_ones: int = 0
    total_pars: int = 0
    total_bogeys: int = 0
    total_double_bogeys: int = 0
    total_triple_bogeys: int = 0
    total_quad_bogeys_plus: int = 0
    total_gir: int = 0
    total_3_putts: int = 0


class OneYearCareerTotals(ResponseModel):
    rounds_played: int = 0
    birdies: int = 0
    eagles: int = 0
    hole_in_ones: int = 0
    gir: int = 0
    double_bogeys: int = 0
    triple_bogeys: int = 0
    quad_bogeys_plus: int = 0
    three_putts: int = 0


class CareerTotals(ResponseModel):
    lifetime: LifetimeCareerTotals = Field(default_factory=LifetimeCareerTotals)
    one_year: OneYearCareerTotals = Field(default_factory=OneYearCareerTotals)


class PerformanceStreaks(ResponseModel):
    """Longest runs of holes. A par streak counts par or better."""
    longest_birdie_streak: int = 0
    longest_par_streak: int = 0
    most_gir_in_a_row: int = 0
    longest_2_putt_or_less_streak: int = 0


class WindowedPerformanceStreaks(ResponseModel):
    lifetime: PerformanceStreaks = Field(default_factory=PerformanceStreaks)
    one_year: PerformanceStreaks = Field(default_factory=PerformanceStreaks)


class PerformanceStreakEvents(ResponseModel):
    """The round each streak reached its length in."""
    longest_birdie_streak: Optional[MilestoneEvent] = None
    longest_par_streak: Optional[MilestoneEvent] = None
    most_gir_in_a_row: Optional[MilestoneEvent] = None
    longest_2_putt_or_less_streak: Optional[MilestoneEvent] = None


class WindowedPerformanceStreakEvents(ResponseModel):
    lifetime: PerformanceStreakEvents = Field(default_factory=PerformanceStreakEvents)
    one_year: PerformanceStreakEvents = Field(default_factory=PerformanceStreakEvents)


class LifetimeHomeCourseRecords(ResponseModel):
    home_course_name: Optional[str] = None
    lowest_score_on_home_course: Optional[int] = None
    most_rounds_played_at_home_course: int = 0


class OneYearHomeCourseRecords(ResponseModel):
    home_course_name: Optional[str] = None
    lowest_score_on_home_course: Optional[int] = None


class HomeCourseRecords(ResponseModel):
    lifetime: LifetimeHomeCourseRecords = Field(default_factory=LifetimeHomeCourseRecords)
    one_year: OneYearHomeCourseRecords = Field(default_factory=OneYearHomeCourseRecords)


class HomeCourseRecordEvent(ResponseModel):
    lowest_score_on_home_course: Optional[MilestoneEvent] = None


class HomeCourseRecordEvents(ResponseModel):
    lifetime: HomeCourseRecordEvent = Field(default_factory=HomeCourseRecordEvent)
    one_year: HomeCourseRecordEvent = Field(default_factory=HomeCourseRecordEvent)


class LifetimePuttingMilestones(ResponseModel):
    fewest_putts_in_round: Optional[int] = None
    most_1_putts_in_round: Optional[int] = None
    most_3_putts_in_round: Optional[int] = None
    putt_breaks: List[ThresholdMilestone] = Field(default_factory=list)  # first round under each putt count


class OneYearPuttingMilestones(ResponseModel):
    fewest_putts_in_round: Optional[int] = None
    most_1_putts_in_round: Optional[int] = None
    most_3_putts_in_round: Optional[int] = None
    putting_milestones_achieved_from_lifetime_set: int = 0


class PuttingMilestones(ResponseModel):
    lifetime: LifetimePuttingMilestones = Field(default_factory=LifetimePuttingMilestones)
    one_year: OneYearPuttingMilestones = Field(default_factory=OneYearPuttingMilestones)


class PuttingMilestoneEvent(ResponseModel):
    fewest_putts_in_round: Optional[MilestoneEvent] = None
    most_1_putts_in_round: Optional[MilestoneEvent] = None
    most_3_putts_in_round: Optional[MilestoneEvent] = None


class PuttingMilestoneEvents(ResponseModel):
    lifetime: PuttingMilestoneEvent = Field(default_factory=PuttingMilestoneEvent)
    one_year: PuttingMilestoneEvent = Field(default_factory=PuttingMilestoneEvent)


class LifetimeGirMilestones(ResponseModel):
    gir_breaks: List[ThresholdMilestone] = Field(default_factory=list)  # first round with each GIR count
    highest_gir_percentage_in_round: Optional[float] = None
    most_gir_in_round: Optional[int] = None


class OneYearGirMilestones(ResponseModel):
    best_gir_round: Optional[MilestoneEvent] = None
    best_gir_in_round: Optional[int] = None
    highest_gir_percentage: Optional[float] = None
    gir_milestones_achieved_from_lifetime_set: int = 0


class GirMilestones(ResponseModel):
    lifetime: LifetimeGirMilestones = Field(default_factory=LifetimeGirMilestones)
    one_year: OneYearGirMilestones = Field(default_factory=OneYearGirMilestones)


class LifetimeGirMilestoneEvents(ResponseModel):
    highest_gir_percentage_in_round: Optional[MilestoneEvent] = None
    most_gir_in_round: Optional[MilestoneEvent] = None


class OneYearGirMilestoneEvents(ResponseModel):
    best_gir_round: Optional[MilestoneEvent] = None
    highest_gir_percentage: Optional[MilestoneEvent] = None


class GirMilestoneEvents(ResponseModel):
    lifetime: LifetimeGirMilestoneEvents = Field(default_factory=LifetimeGirMilestoneEvents)
    one_year: OneYearGirMilestoneEvents = Field(default_factory=OneYearGirMilestoneEvents)


class LifetimeRoundMilestones(ResponseModel):
    score_breaks: List[ThresholdMilestone] = Field(default_factory=list)  # first round under each score
    first_round_under_par: Optional[UnderParEvent] = None
    first_eagle: Optional[MilestoneEvent] = None
    first_hole_in_one: Optional[MilestoneEvent] = None


class OneYearRoundMilestones(ResponseModel):
    new_personal_records_achieved_count: int = 0
    new_personal_records_achieved: List[str] = Field(default_factory=list)  # e.g. "break_90"


class RoundMilestones(ResponseModel):
    lifetime: LifetimeRoundMilestones = Field(default_factory=LifetimeRoundMilestones)
    one_year: OneYearRoundMilestones = Field(default_factory=OneYearRoundMilestones)


class NotableAchievements(ResponseModel):
    """Records, totals, streaks and milestones over the rounds sent, and over the last `window_days`."""
    scoring_records: ScoringRecords = Field(default_factory=ScoringRecords)
    scoring_records_events: ScoringRecordEvents = Field(default_factory=ScoringRecordEvents)
    career_totals: CareerTotals = Field(default_factory=CareerTotals)
    best_performance_streaks: WindowedPerformanceStreaks = Field(default_factory=WindowedPerformanceStreaks)
    best_performance_streaks_events: WindowedPerformanceStreakEvents = Field(
        default_factory=WindowedPerformanceStreakEvents
    )
    home_course_records: HomeCourseRecords = Field(default_factory=HomeCourseRecords)
    home_course_records_events: HomeCourseRecordEvents = Field(default_factory=HomeCourseRecordEvents)
    putting_milestones: PuttingMilestones = Field(default_factory=PuttingMilestones)
    putting_milestones_events: PuttingMilestoneEvents = Field(default_factory=PuttingMilestoneEvents)
    gir_milestones: GirMilestones = Field(default_factory=GirMilestones)
    gir_milestones_events: GirMilestoneEvents = Field(default_factory=GirMilestoneEvents)
    round_milestones: RoundMilestones = Field(default_factory=RoundMilestones)
    window_days: int = 365


class AnalyticsResponse(ResponseModel):
    """The analytics page's figures over the rounds asked for. Every per-round series is oldest first."""
    kpis: AnalyticsKpis = Field(default_factory=AnalyticsKpis)
    score_trend: List[ScoreTrendRow] = Field(default_factory=list)
    net_score_trend: List[NetScoreTrendRow] = Field(default_factory=list)
    gir_trend: List[GirTrendRow] = Field(default_factory=list)
    putts_trend: List[PuttsTrendRow] = Field(default_factory=list)
    three_putts_trend: List[ThreePuttsTrendRow] = Field(default_factory=list)
    scrambling_trend: List[ScramblingTrendRow] = Field(default_factory=list)
    up_and_down_trend: List[UpAndDownTrendRow] = Field(default_factory=list)
    score_type_distribution: List[ScoreTypeRow] = Field(default_factory=list)
    scoring_by_par: List[ScoringByParRow] = Field(default_factory=list)
    scoring_by_yardage: List[ScoringByYardageRow] = Field(default_factory=list)
    scoring_by_handicap: List[ScoringByHandicapRow] = Field(default_factory=list)
    gir_vs_non_gir: List[GirVsNonGirRow] = Field(default_factory=list)
    handicap_trend: List[HandicapTrendRow] = Field(default_factory=list)
    score_differentials: List[ScoreDifferentialRow] = Field(default_factory=list)
    notable_achievements: NotableAchievements = Field(default_factory=NotableAchievements)


class PlayedCourseResponse(ResponseModel):
    """A course the player has a round linked to."""
    id: str
    name: Optional[str] = None
    location: Optional[str] = None


class ComparisonRow(ResponseModel):
    """The selected round, or a trailing average ending at it ("Last 5 Avg")."""
    label: str
    sample_size: int
    round_id: Optional[str] = None  # set on the selected round's row only
    primary_value: Optional[float] = None
    secondary_value: Optional[float] = None


class RoundComparisonResponse(ResponseModel):
    """A round against the player's trailing averages, one list per metric."""
    score: List[ComparisonRow] = Field(default_factory=list)  # strokes, then to par
    putts: List[ComparisonRow] = Field(default_factory=list)
    gir: List[ComparisonRow] = Field(default_factory=list)  # greens, then percent
    three_putts: List[ComparisonRow] = Field(default_factory=list)  # count, then percent
    putts_per_gir: List[ComparisonRow] = Field(default_factory=list)
    scrambling: List[ComparisonRow] = Field(default_factory=list)  # saves, then percent


GoalSaverType = Literal[
    "three_putt_bleed",
    "blowup_holes",
    "achilles_heel",
    "home_course_demon",
    "gir_opportunity",
    "scrambling_opportunity",
    "par5_opportunity",
]


class GoalSaver(ResponseModel):
    """One place to find strokes, with the server's wording for it."""
    type: GoalSaverType
    strokes_saved: float
    percentage_of_gap: float
    headline: str
    detail: str
    data: Dict[str, Any] = Field(default_factory=dict)  # the figures behind the saver; its keys vary by type


class GoalReportResponse(ResponseModel):
    """How far the player's average is from their goal, with the savers worth the most strokes first."""
    scoring_average: Optional[float] = None
    best_score: Optional[int] = None
    scoring_goal: int
    gap: Optional[float] = None  # average less goal; at or below 0 is on track
    on_track: bool = False
    progress_pct: Optional[float] = None  # from the window's first round toward the goal, 0-100
    savers: List[GoalSaver] = Field(default_factory=list)


class CourseScoreTrendRow(ResponseModel):
    """One round at the course, oldest first."""
    round_index: int
    round_id: Optional[str] = None
    date: Optional[datetime] = None
    total_score: Optional[int] = None
    to_par: Optional[int] = None


class CourseHoleToParRow(ResponseModel):
    hole_number: int
    par: int
    average_score: float
    average_to_par: float
    sample_size: int


class CourseHoleDifficultyRow(CourseHoleToParRow):
    difficulty_rank: int  # 1 is the hardest hole by average to-par


class CourseHoleGirRow(ResponseModel):
    hole_number: int
    par: int
    gir_hits: int
    sample_size: int
    gir_percentage: float


class CourseHolePuttsRow(ResponseModel):
    hole_number: int
    par: int
    average_putts: float
    sample_size: int


class CourseHoleScoreTypeRow(ResponseModel):
    """Percent of rounds that landed in each score type on the hole. `par` is the par percentage."""
    hole_number: int
    sample_size: int
    eagle: float
    birdie: float
    par: float
    bogey: float
    double_bogey: float
    triple_bogey: float
    quad_bogey: float


class CourseGirImpactRow(ResponseModel):
    bucket: Literal["GIR", "No GIR"]
    holes_counted: int
    average_score: Optional[float] = None
    average_to_par: Optional[float] = None


class CourseHoleVarianceRow(ResponseModel):
    hole_number: int
    par: int
    sample_size: int
    average_score: Optional[float] = None
    score_variance: Optional[float] = None
    score_std_dev: Optional[float] = None
    variance_rank: int  # 1 is the least consistent hole


class CourseAnalyticsResponse(ResponseModel):
    """The player's figures at one course. Every figure is worked out here, not on the client."""
    course_id: str
    rounds_played: int
    scoring_average: Optional[float] = None
    best_score: Optional[int] = None
    worst_score: Optional[int] = None
    rounds: List[RoundSummaryResponse] = Field(default_factory=list)  # newest first
    score_trend_on_course: List[CourseScoreTrendRow] = Field(default_factory=list)
    average_score_relative_to_par_by_hole: List[CourseHoleToParRow] = Field(default_factory=list)
    gir_percentage_by_hole: List[CourseHoleGirRow] = Field(default_factory=list)
    average_putts_by_hole: List[CourseHolePuttsRow] = Field(default_factory=list)
    score_type_distribution_by_hole: List[CourseHoleScoreTypeRow] = Field(default_factory=list)
    course_difficulty_profile_by_hole: List[CourseHoleDifficultyRow] = Field(default_factory=list)
    average_score_when_gir_vs_missed: List[CourseGirImpactRow] = Field(default_factory=list)
    score_variance_by_hole: List[CourseHoleVarianceRow] = Field(default_factory=list)


class CourseSummaryResponse(ResponseModel):
    """Course for card/list views."""
    id: str
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    source: Literal["local", "external"] = "local"  # external = found through GolfCourseAPI, not saved yet
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
