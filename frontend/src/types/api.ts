import type { components } from "./api.gen";

type Schemas = components["schemas"];

export type HoleDto = Schemas["Hole"];
export type TeeDto = Schemas["TeeResponse"];
export type CourseDto = Schemas["CourseResponse"];
export type CourseSummaryDto = Schemas["CourseSummaryResponse"];
export type UserDto = Schemas["UserResponse"];
export type UserTeeDto = Schemas["UserTee"];

export type HoleScoreDto = Schemas["HoleScoreResponse"];
export type HoleSummaryDto = Schemas["HoleSummaryResponse"];
export type ScoreCountsDto = Schemas["ScoreCounts"];
export type NinesDto = Schemas["Nines"];
export type RoundDto = Schemas["RoundResponse"];
export type RoundSummaryDto = Schemas["RoundSummaryResponse"];
export type DashboardDto = Schemas["DashboardResponse"];
export type ScoreMixDto = Schemas["ScoreMix"];
export type WhsBreakdownDto = Schemas["WhsBreakdown"];
export type CourseAnalyticsDto = Schemas["CourseAnalyticsResponse"];
export type CourseHoleStatsRowDto = Schemas["CourseHoleStatsRow"];
export type ScoreTrendRowDto = Schemas["ScoreTrendRow"];
export type HandicapTrendRowDto = Schemas["HandicapTrendRow"];
export type AnalyticsDto = Schemas["AnalyticsResponse"];
export type AnalyticsKpisDto = Schemas["AnalyticsKpis"];
export type HeadlineFigureDto = Schemas["HeadlineFigure"];
export type PuttsPerHoleDto = Schemas["PuttsPerHole"];
export type NetScoreTrendRowDto = Schemas["NetScoreTrendRow"];
export type GirTrendRowDto = Schemas["GirTrendRow"];
export type PuttsTrendRowDto = Schemas["PuttsTrendRow"];
export type ThreePuttsTrendRowDto = Schemas["ThreePuttsTrendRow"];
export type ScoringByParRowDto = Schemas["ScoringByParRow"];
export type ScoringByYardageRowDto = Schemas["ScoringByYardageRow"];
export type ScoringByHandicapRowDto = Schemas["ScoringByHandicapRow"];
export type GirVsNonGirRowDto = Schemas["GirVsNonGirRow"];
export type NotableAchievementsDto = Schemas["NotableAchievements"];
export type MilestoneEventDto = Schemas["MilestoneEvent"];
export type MilestoneAchievementDto = Schemas["MilestoneAchievement"];
export type PlayedCourseDto = Schemas["PlayedCourseResponse"];
export type RoundComparisonDto = Schemas["RoundComparisonResponse"];
export type PeakGameDto = Schemas["PeakGame"];
export type PeakImpactDto = Schemas["PeakImpact"];
export type GoalReportDto = Schemas["GoalReportResponse"];
export type GoalSaverDto = Schemas["GoalSaver"];
export type GoalAttemptDto = Schemas["GoalAttempt"];
export type BenchmarkComparisonDto = Schemas["BenchmarkComparisonResponse"];
export type BenchmarkShapeDto = Schemas["BenchmarkShape"];
export type BenchmarkVerdictsDto = Schemas["BenchmarkVerdicts"];
export type ParTypeComparisonDto = Schemas["ParTypeComparison"];
export type FriendshipDto = Schemas["FriendshipResponse"];
export type FriendshipStatusRequestDto = Schemas["FriendshipStatusRequest"];
export type UserChangesDto = Schemas["UpdateUserRequest"];

export type AuthUserDto = Schemas["AuthUserResponse"];
export type RegisterDto = Schemas["RegisterResponse"];
export type MessageDto = Schemas["MessageResponse"];

export type ScanDto = Schemas["ScanResponse"];
export type ScannedRoundDto = Schemas["ScannedRound"];
export type ScannedTeeDto = Schemas["ScannedTee"];
export type ScannedHoleScoreDto = Schemas["ScannedHoleScore"];
export type FieldConfidenceDto = Schemas["FieldConfidence"];
export type OcrTextDto = Schemas["OcrTextResponse"];
export type SaveScanDto = Schemas["SaveScanResponse"];

export type SaveScanRequestDto = Schemas["SaveRoundRequest"];
