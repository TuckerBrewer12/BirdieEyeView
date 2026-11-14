from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Dict, List, Literal, Optional

from analytics.verdicts import ChangeVerdict
from models import Hole, UserTee
from models.hole_score import ScoreKind


class ResponseModel(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)


class ScoreCounts(ResponseModel):
    eagle: int = 0
    birdie: int = 0
    par: int = 0
    bogey: int = 0
    double: int = 0
    triple: int = 0
    quad: int = 0


class TeeResponse(ResponseModel):
    color: Optional[str] = None
    slope_rating: Optional[float] = None
    course_rating: Optional[float] = None
    hole_yardages: Dict[int, int] = Field(default_factory=dict)
    total_yardage: Optional[int] = None
    front_nine_yardage: Optional[int] = None
    back_nine_yardage: Optional[int] = None
    course_handicap: Optional[int] = None


class CourseResponse(ResponseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    location: Optional[str] = None
    user_id: Optional[str] = None
    par: Optional[int] = None
    front_nine_par: Optional[int] = None
    back_nine_par: Optional[int] = None
    holes: List[Hole] = Field(default_factory=list)
    tees: List[TeeResponse] = Field(default_factory=list)


class HoleScoreResponse(ResponseModel):
    hole_number: int
    strokes: Optional[int] = None
    net_score: Optional[int] = None
    putts: Optional[int] = None
    shots_to_green: Optional[int] = None
    fairway_hit: Optional[bool] = None
    green_in_regulation: Optional[bool] = None
    par_played: Optional[int] = None
    handicap_played: Optional[int] = None
    par: Optional[int] = None
    handicap: Optional[int] = None
    yardage: Optional[int] = None
    to_par: Optional[int] = None
    kind: Optional[ScoreKind] = None
    three_putt: bool = False
    running_to_par: Optional[int] = None


class NineFigures(ResponseModel):
    par: Optional[int] = None
    to_par: Optional[int] = None
    putts: Optional[int] = None
    gir: Optional[int] = None
    yards: Optional[int] = None


class Nines(ResponseModel):
    front: NineFigures = Field(default_factory=NineFigures)
    back: NineFigures = Field(default_factory=NineFigures)


class RoundFigures(ResponseModel):
    total_score: Optional[int] = None
    par: Optional[int] = None
    to_par: Optional[int] = None
    front_nine: Optional[int] = None
    back_nine: Optional[int] = None
    total_putts: Optional[int] = None
    total_gir: Optional[int] = None
    fairways_hit: Optional[int] = None
    nines: Nines = Field(default_factory=Nines)
    yards: Optional[int] = None
    score_counts: ScoreCounts = Field(default_factory=ScoreCounts)
    holes_played: int = 0


class HoleSummaryResponse(ResponseModel):
    hole_number: int
    strokes: Optional[int] = None
    kind: Optional[ScoreKind] = None
    running_to_par: Optional[int] = None


class RoundSummaryResponse(ResponseModel):
    id: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    total_score: Optional[int] = None
    to_par: Optional[int] = None
    front_nine: Optional[int] = None
    back_nine: Optional[int] = None
    total_putts: Optional[int] = None
    score_counts: ScoreCounts = Field(default_factory=ScoreCounts)
    hole_scores: List[HoleSummaryResponse] = Field(default_factory=list)
    best_rank: Optional[int] = None
    worst_rank: Optional[int] = None


class WorstStretch(ResponseModel):
    first_hole: int
    last_hole: int
    to_par: int


class RoundResponse(RoundFigures):
    id: Optional[str] = None
    course: Optional[CourseResponse] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    weather_conditions: Optional[str] = None
    notes: Optional[str] = None
    course_name_played: Optional[str] = None
    user_tee: Optional[UserTee] = None
    hole_scores: List[HoleScoreResponse] = Field(default_factory=list)
    course_handicap: Optional[int] = None
    net_score: Optional[int] = None
    worst_stretch: Optional[WorstStretch] = None


class ScoreMix(ResponseModel):
    eagle: float = 0.0
    birdie: float = 0.0
    par: float = 0.0
    bogey: float = 0.0
    double: float = 0.0
    triple: float = 0.0
    quad: float = 0.0


class HandicapChange(ResponseModel):
    this_month: Optional[float] = None
    this_month_verdict: Optional[ChangeVerdict] = None


class WhsRound(ResponseModel):
    round_index: int
    course_name: Optional[str] = None
    course_rating: Optional[float] = None
    slope_rating: Optional[float] = None
    score: Optional[int] = None
    differential: Optional[float] = None
    used: bool = False


class WhsBreakdown(ResponseModel):
    rows: List[WhsRound] = Field(default_factory=list)
    window_size: int = 0
    count_used: int = 0
    adjustment: float = 0.0
    diff_avg: Optional[float] = None
    has_rated_rounds: bool = False


DifferentialStatus = Literal["counting", "close", "out", "unrated"]


class ScoreTrendRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    total_score: Optional[int] = None
    to_par: Optional[int] = None
    par: Optional[int] = None
    course_name: Optional[str] = None
    rolling_average: Optional[float] = None
    score_counts: ScoreCounts = Field(default_factory=ScoreCounts)


class HandicapTrendRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    handicap_index: Optional[float] = None
    differential: Optional[float] = None
    used_in_hi: Optional[bool] = None
    hi_threshold: Optional[float] = None
    differential_status: DifferentialStatus = "unrated"
    in_window: bool = False


class DashboardResponse(ResponseModel):
    best_round: Optional[int] = None
    best_round_id: Optional[str] = None
    best_round_course: Optional[str] = None
    best_round_to_par: Optional[int] = None
    best_round_date: Optional[datetime] = None
    handicap_index: Optional[float] = None
    recent_rounds: List[RoundSummaryResponse]
    scoring_average_l5: Optional[float] = None
    scoring_average_change: Optional[float] = None
    scoring_average_verdict: Optional[ChangeVerdict] = None
    handicap_change: HandicapChange = Field(default_factory=HandicapChange)
    recent_score_mix: ScoreMix = Field(default_factory=ScoreMix)
    whs: WhsBreakdown = Field(default_factory=WhsBreakdown)
    score_trend: List[ScoreTrendRow] = Field(default_factory=list)
    handicap_trend: List[HandicapTrendRow] = Field(default_factory=list)
    rounds_this_year: int = 0


class AnalyticsKpis(ResponseModel):
    scoring_average: Optional[float] = None
    gir_percentage: Optional[float] = None
    putts_per_gir: Optional[float] = None
    scrambling_percentage: Optional[float] = None
    up_and_down_percentage: Optional[float] = None
    handicap_index: Optional[float] = None
    total_rounds: int = 0
    best_round: Optional[int] = None
    best_round_id: Optional[str] = None
    best_round_course: Optional[str] = None
    average_putts: Optional[float] = None
    three_putts_per_round: Optional[float] = None
    three_putt_rate: Optional[float] = None


class NetScoreTrendRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    gross_score: Optional[int] = None
    course_handicap: Optional[int] = None
    net_score: Optional[int] = None
    course_name: Optional[str] = None
    to_par: Optional[int] = None
    rolling_average: Optional[float] = None


class GirTrendRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    total_gir: Optional[int] = None
    holes_played: int
    gir_percentage: Optional[float] = None
    rolling_average: Optional[float] = None


class PuttsTrendRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    total_putts: Optional[int] = None
    holes_played: int
    rolling_average: Optional[float] = None


class ThreePuttsTrendRow(ResponseModel):
    round_index: int
    round_id: Optional[str] = None
    three_putt_count: int
    holes_with_putt_data: int
    three_putt_percentage: float
    costly: bool = False


class ScoringByParRow(ResponseModel):
    par: int
    average_to_par: float
    average_strokes: float
    sample_size: int


class YardageScore(ResponseModel):
    to_par: int
    yardage: int


class ScoringByYardageRow(ResponseModel):
    par: int
    bucket_label: str
    bucket_order: int
    average_to_par: float
    average_strokes: float
    gir_percentage: Optional[float] = None
    sample_size: int
    score_mix: ScoreMix = Field(default_factory=ScoreMix)
    raw_scores: List[YardageScore] = Field(default_factory=list)
    worst: bool = False


class ScoringByHandicapRow(ResponseModel):
    handicap: int
    average_to_par: float
    sample_size: int
    hardest: bool = False


class GirVsNonGirRow(ResponseModel):
    bucket: Literal["GIR", "No GIR"]
    holes_counted: int
    eagle: float
    birdie: float
    par: float
    bogey: float
    double_bogey: float
    triple_bogey: float
    quad_bogey: float


class MilestoneEvent(ResponseModel):
    date: str
    course: str
    round_id: Optional[str] = None


class MilestoneAchievement(MilestoneEvent):
    in_window: bool = False


class UnderParEvent(MilestoneAchievement):
    score: int


class ThresholdMilestone(ResponseModel):
    threshold: int
    achievement: Optional[MilestoneAchievement] = None


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
    longest_birdie_streak: int = 0
    longest_par_streak: int = 0
    most_gir_in_a_row: int = 0
    longest_2_putt_or_less_streak: int = 0


class WindowedPerformanceStreaks(ResponseModel):
    lifetime: PerformanceStreaks = Field(default_factory=PerformanceStreaks)
    one_year: PerformanceStreaks = Field(default_factory=PerformanceStreaks)


class PerformanceStreakEvents(ResponseModel):
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
    putt_breaks: List[ThresholdMilestone] = Field(default_factory=list)


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
    gir_breaks: List[ThresholdMilestone] = Field(default_factory=list)
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
    score_breaks: List[ThresholdMilestone] = Field(default_factory=list)
    under_par_position: int = 0
    first_round_under_par: Optional[UnderParEvent] = None
    first_eagle: Optional[MilestoneAchievement] = None
    first_hole_in_one: Optional[MilestoneAchievement] = None


class OneYearRoundMilestones(ResponseModel):
    new_personal_records_achieved_count: int = 0


class RoundMilestones(ResponseModel):
    lifetime: LifetimeRoundMilestones = Field(default_factory=LifetimeRoundMilestones)
    one_year: OneYearRoundMilestones = Field(default_factory=OneYearRoundMilestones)


class NotableAchievements(ResponseModel):
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


class PeakRound(ResponseModel):
    round_id: Optional[str] = None
    course_name: Optional[str] = None
    score: int


class PeakImpact(ResponseModel):
    kind: Literal["birdies", "bogeys", "doubles"]
    peak: float
    average: float
    strokes: float


class PeakGame(ResponseModel):
    rounds: List[PeakRound] = Field(default_factory=list)
    average: float
    impacts: List[PeakImpact] = Field(default_factory=list)


class HeadlineFigure(ResponseModel):
    metric: Literal["scoring_average", "gir_percentage", "average_putts", "scrambling_percentage", "three_putt_rate"]
    value: Optional[float] = None
    change: Optional[float] = None
    verdict: Optional[ChangeVerdict] = None
    trend: List[float] = Field(default_factory=list)


class PuttsPerHole(ResponseModel):
    holes: int = 0
    one_or_fewer: float = 0.0
    two: float = 0.0
    three_or_more: float = 0.0


class TourShortGame(ResponseModel):
    scrambling_percentage: float
    up_and_down_percentage: float


class AnalyticsResponse(ResponseModel):
    kpis: AnalyticsKpis = Field(default_factory=AnalyticsKpis)
    score_trend: List[ScoreTrendRow] = Field(default_factory=list)
    net_score_trend: List[NetScoreTrendRow] = Field(default_factory=list)
    gir_trend: List[GirTrendRow] = Field(default_factory=list)
    putts_trend: List[PuttsTrendRow] = Field(default_factory=list)
    three_putts_trend: List[ThreePuttsTrendRow] = Field(default_factory=list)
    scoring_by_par: List[ScoringByParRow] = Field(default_factory=list)
    scoring_by_yardage: List[ScoringByYardageRow] = Field(default_factory=list)
    scoring_by_handicap: List[ScoringByHandicapRow] = Field(default_factory=list)
    gir_vs_non_gir: List[GirVsNonGirRow] = Field(default_factory=list)
    handicap_trend: List[HandicapTrendRow] = Field(default_factory=list)
    notable_achievements: NotableAchievements = Field(default_factory=NotableAchievements)
    score_mix: ScoreMix = Field(default_factory=ScoreMix)
    peak_game: Optional[PeakGame] = None
    headline: List[HeadlineFigure] = Field(default_factory=list)
    putts_per_hole: PuttsPerHole = Field(default_factory=PuttsPerHole)
    tour_short_game: Optional[TourShortGame] = None
    next_level_handicap: Optional[int] = None
    par_types: List["ParTypeComparison"] = Field(default_factory=list)


class PlayedCourseResponse(ResponseModel):
    id: str
    name: Optional[str] = None
    location: Optional[str] = None


class ComparisonFigure(ResponseModel):
    metric: Literal["score", "putts", "greens", "three_putts", "putts_per_gir", "scrambling"]
    value: Optional[float] = None
    average: Optional[float] = None
    difference: Optional[float] = None
    verdict: Optional[Literal["good", "bad", "neutral"]] = None


class ComparisonWindowResponse(ResponseModel):
    window: Literal["l5", "l20", "all"]
    rounds: int
    metrics: List[ComparisonFigure] = Field(default_factory=list)


class RoundComparisonResponse(ResponseModel):
    windows: List[ComparisonWindowResponse] = Field(default_factory=list)


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
    type: GoalSaverType
    strokes_saved: float
    percentage_of_gap: float
    headline: str
    detail: str
    data: Dict[str, Any] = Field(default_factory=dict)


class GoalAttempt(ResponseModel):
    round_id: Optional[str] = None
    score: int
    met_goal: bool


class GoalReportResponse(ResponseModel):
    scoring_average: Optional[float] = None
    lowest_score: Optional[int] = None
    scoring_goal: int
    gap: Optional[float] = None
    on_track: bool = False
    progress_pct: Optional[float] = None
    rounds_meeting_goal: int = 0
    peak_gap: Optional[float] = None
    peak_meets_goal: Optional[bool] = None
    attempts: List[GoalAttempt] = Field(default_factory=list)
    savers: List[GoalSaver] = Field(default_factory=list)


class BenchmarkShape(ResponseModel):
    gir_percentage: Optional[float] = None
    scrambling_percentage: Optional[float] = None
    putts_per_gir: Optional[float] = None
    par3_to_par: Optional[float] = None
    par4_to_par: Optional[float] = None
    par5_to_par: Optional[float] = None


class ParTypeComparison(ResponseModel):
    par: Literal[3, 4, 5]
    average_to_par: Optional[float] = None
    benchmark_to_par: Optional[float] = None
    gap: Optional[float] = None
    verdict: Optional[Literal["ahead", "even", "behind"]] = None


AnalyticsResponse.model_rebuild()


class BenchmarkVerdicts(ResponseModel):
    gir_percentage: Optional[Literal["ahead", "even", "behind"]] = None
    scrambling_percentage: Optional[Literal["ahead", "even", "behind"]] = None
    putts_per_gir: Optional[Literal["ahead", "even", "behind"]] = None
    par3_to_par: Optional[Literal["ahead", "even", "behind"]] = None
    par4_to_par: Optional[Literal["ahead", "even", "behind"]] = None
    par5_to_par: Optional[Literal["ahead", "even", "behind"]] = None


class BenchmarkComparisonResponse(ResponseModel):
    against: Literal["handicap", "friend"]
    handicap: Optional[int] = None
    benchmark: Optional[BenchmarkShape] = None
    par_types: List[ParTypeComparison] = Field(default_factory=list)
    verdicts: BenchmarkVerdicts = Field(default_factory=BenchmarkVerdicts)


class CourseHoleStatsRow(ResponseModel):
    hole_number: int
    par: int
    sample_size: int
    average_score: float
    average_to_par: float
    difficulty_rank: int
    score_std_dev: Optional[float] = None
    gir_percentage: Optional[float] = None
    average_putts: Optional[float] = None
    putts_verdict: Optional[ChangeVerdict] = None
    score_mix: ScoreMix


class CourseAnalyticsResponse(ResponseModel):
    course_id: str
    rounds_played: int
    last_played: Optional[datetime] = None
    scoring_average: Optional[float] = None
    scoring_average_to_par: Optional[float] = None
    best_round_id: Optional[str] = None
    worst_round_id: Optional[str] = None
    rounds: List[RoundSummaryResponse] = Field(default_factory=list)
    score_trend: List[ScoreTrendRow] = Field(default_factory=list)
    holes: List[CourseHoleStatsRow] = Field(default_factory=list)
    hole_to_par_front_nine: Optional[float] = None
    hole_to_par_back_nine: Optional[float] = None
    hole_to_par_total: Optional[float] = None
    gir_front_nine: Optional[float] = None
    gir_back_nine: Optional[float] = None
    gir_total: Optional[float] = None


class CourseSummaryResponse(ResponseModel):
    id: str
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    source: Literal["local", "external"] = "local"
    location: Optional[str] = None
    par: Optional[int] = None
    total_holes: int = 0
    tee_count: int = 0
    tees: List[str] = Field(default_factory=list)
    rounds_played: int = 0
    scoring_average: Optional[float] = None
    best_score: Optional[int] = None


class AIComparisonItem(ResponseModel):
    metric: str
    category: str
    player_value: Optional[float] = None
    benchmark_value: float
    unit: str
    lower_is_better: bool
    has_data: bool


class AIInsightItem(ResponseModel):
    category: str
    category_group: str
    title: str
    description: str
    priority_score: float
    key_metric: Optional[float] = None
    metric_label: str
    benchmark: Optional[float] = None
    trend_direction: str
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


class UserResponse(ResponseModel):
    id: str
    friend_code: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    home_course_id: Optional[str] = None
    handicap: Optional[float] = None
    created_at: Optional[datetime] = None
    scoring_goal: Optional[int] = None


ConfidenceLevel = Literal["high", "medium", "low", "very_low"]
"""How sure the scan is of a reading, from its 0-1 confidence."""


class ScannedHole(ResponseModel):
    number: int
    par: Optional[int] = None
    handicap: Optional[int] = None


class ScannedTee(ResponseModel):
    color: Optional[str] = None
    slope_rating: Optional[float] = None
    course_rating: Optional[float] = None
    hole_yardages: Dict[str, int] = Field(default_factory=dict)
    course_handicap: Optional[int] = None


class ScannedCourse(ResponseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    par: Optional[int] = None
    holes: List[ScannedHole] = Field(default_factory=list)
    tees: List[ScannedTee] = Field(default_factory=list)


class ScannedHoleScore(ResponseModel):
    hole_number: int
    strokes: Optional[int] = None
    putts: Optional[int] = None
    shots_to_green: Optional[int] = None
    fairway_hit: Optional[bool] = None
    green_in_regulation: Optional[bool] = None


class ScannedRound(ResponseModel):
    course: Optional[ScannedCourse] = None
    tee_box: Optional[str] = None
    date: Optional[str] = None
    hole_scores: List[ScannedHoleScore] = Field(default_factory=list)
    notes: Optional[str] = None


class FieldConfidence(ResponseModel):
    final_confidence: float
    level: ConfidenceLevel
    validation_flags: List[str] = Field(default_factory=list)


class HoleFieldConfidence(ResponseModel):
    strokes: Optional[FieldConfidence] = None
    putts: Optional[FieldConfidence] = None
    green_in_regulation: Optional[FieldConfidence] = None


class HoleConfidence(ResponseModel):
    hole_number: int
    fields: HoleFieldConfidence
    overall: float
    level: ConfidenceLevel


class ScanConfidence(ResponseModel):
    overall: float
    level: ConfidenceLevel
    hole_scores: List[HoleConfidence] = Field(default_factory=list)


class ScanResponse(ResponseModel):
    round: ScannedRound
    confidence: ScanConfidence
    fields_needing_review: List[str] = Field(default_factory=list)


class OcrTextResponse(ResponseModel):
    ocr_text: str


class SaveScanResponse(ResponseModel):
    id: str
    total_score: Optional[int] = None
