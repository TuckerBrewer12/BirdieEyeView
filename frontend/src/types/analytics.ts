import type {
  AnalyticsDto,
  AnalyticsKpisDto,
  ComparisonRowDto,
  CourseAnalyticsDto,
  CourseScoreTrendRowDto,
  GirTrendRowDto,
  GirVsNonGirRowDto,
  GoalReportDto,
  GoalSaverDto,
  HandicapTrendRowDto,
  MilestoneEventDto,
  NetScoreTrendRowDto,
  NotableAchievementsDto,
  PuttsTrendRowDto,
  RoundComparisonDto,
  ScoreDifferentialRowDto,
  ScoreTrendRowDto,
  ScoreTypeRowDto,
  ScoringByHandicapRowDto,
  ScoringByParRowDto,
  ScoringByYardageRowDto,
  ScramblingTrendRowDto,
  ThreePuttsTrendRowDto,
  UpAndDownTrendRowDto,
} from "./api";

/** What the analytics page asks the server for. */
export interface AnalyticsFilters {
  limit: number;
  timeframe: "all" | "ytd" | "1y";
  courseId: "all" | "home" | string;
}

// Every response below is generated from the backend's models; see ./api.ts.
export type AnalyticsData = AnalyticsDto;
export type AnalyticsKPIs = AnalyticsKpisDto;
export type HandicapTrendRow = HandicapTrendRowDto;
export type ScoreDifferentialRow = ScoreDifferentialRowDto;
export type ScoreTrendRow = ScoreTrendRowDto;
export type NetScoreTrendRow = NetScoreTrendRowDto;
export type GIRTrendRow = GirTrendRowDto;
export type PuttsTrendRow = PuttsTrendRowDto;
export type ThreePuttRow = ThreePuttsTrendRowDto;
export type ScramblingRow = ScramblingTrendRowDto;
export type UpAndDownRow = UpAndDownTrendRowDto;
export type ScoreTypeRow = ScoreTypeRowDto;
export type ScoringByParRow = ScoringByParRowDto;
export type ScoringByHandicapRow = ScoringByHandicapRowDto;
export type ScoringByYardageRow = ScoringByYardageRowDto;
export type GIRvsNonGIRRow = GirVsNonGirRowDto;
export type MilestoneEvent = MilestoneEventDto;
export type NotableAchievements = NotableAchievementsDto;

export type ComparisonRow = ComparisonRowDto;
export type RoundComparison = RoundComparisonDto;

export type GoalSaver = GoalSaverDto;
export type GoalReport = GoalReportDto;

export type CourseAnalyticsData = CourseAnalyticsDto;
export type CourseScoreTrendRow = CourseScoreTrendRowDto;
