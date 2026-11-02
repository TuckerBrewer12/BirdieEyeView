/**
 * Response types generated from the backend's OpenAPI schema (`api.gen.ts`).
 * Regenerate with `npm run gen:api` after changing an API model; CI fails if they are stale.
 */
import type { components } from "./api.gen";

type Schemas = components["schemas"];

export type HoleDto = Schemas["Hole"];
export type TeeDto = Schemas["TeeResponse"];
export type CourseDto = Schemas["CourseResponse"];
export type CourseSummaryDto = Schemas["CourseSummaryResponse"];
export type UserDto = Schemas["UserResponse"];
export type UserTeeDto = Schemas["UserTee"];
export type HandicapIndexDto = Schemas["HandicapIndexResponse"];
export type HoleScoreDto = Schemas["HoleScoreResponse"];
export type HoleSummaryDto = Schemas["HoleSummaryResponse"];
export type ScoreCountsDto = Schemas["ScoreCounts"];
export type NinesDto = Schemas["Nines"];
export type RoundDto = Schemas["RoundResponse"];
export type RoundSummaryDto = Schemas["RoundSummaryResponse"];
export type DashboardDto = Schemas["DashboardResponse"];
export type ScoreMixDto = Schemas["ScoreMix"];
export type WhsBreakdownDto = Schemas["WhsBreakdown"];
export type MilestoneDto = Schemas["Milestone"];
export type CourseAnalyticsDto = Schemas["CourseAnalyticsResponse"];
export type CourseScoreTrendRowDto = Schemas["CourseScoreTrendRow"];
export type CourseHoleToParRowDto = Schemas["CourseHoleToParRow"];
export type CourseHoleDifficultyRowDto = Schemas["CourseHoleDifficultyRow"];
export type CourseHoleScoreTypeRowDto = Schemas["CourseHoleScoreTypeRow"];
export type CourseHoleGirRowDto = Schemas["CourseHoleGirRow"];
export type CourseHolePuttsRowDto = Schemas["CourseHolePuttsRow"];
export type CourseHoleVarianceRowDto = Schemas["CourseHoleVarianceRow"];
export type ScoreTrendRowDto = Schemas["ScoreTrendRow"];
export type HandicapTrendRowDto = Schemas["HandicapTrendRow"];
export type ScramblingTrendRowDto = Schemas["ScramblingTrendRow"];
export type UpAndDownTrendRowDto = Schemas["UpAndDownTrendRow"];
export type AnalyticsDto = Schemas["AnalyticsResponse"];
export type AnalyticsKpisDto = Schemas["AnalyticsKpis"];
export type AnalyticsScoreTrendRowDto = Schemas["AnalyticsScoreTrendRow"];
/** One of the analytics page's insights, told apart by `kind`. The page words it. */
export type AnalyticsInsightDto = AnalyticsDto["insights"][number];
export type NetScoreTrendRowDto = Schemas["NetScoreTrendRow"];
export type GirTrendRowDto = Schemas["GirTrendRow"];
export type PuttsTrendRowDto = Schemas["PuttsTrendRow"];
export type ThreePuttsTrendRowDto = Schemas["ThreePuttsTrendRow"];
export type ScoringByParRowDto = Schemas["ScoringByParRow"];
export type ScoringByYardageRowDto = Schemas["ScoringByYardageRow"];
export type ScoringByHandicapRowDto = Schemas["ScoringByHandicapRow"];
export type GirVsNonGirRowDto = Schemas["GirVsNonGirRow"];
export type ScoreDifferentialRowDto = Schemas["ScoreDifferentialRow"];
export type NotableAchievementsDto = Schemas["NotableAchievements"];
export type MilestoneEventDto = Schemas["MilestoneEvent"];
export type MilestoneAchievementDto = Schemas["MilestoneAchievement"];
export type PlayedCourseDto = Schemas["PlayedCourseResponse"];
export type ComparisonRowDto = Schemas["ComparisonRow"];
export type RoundComparisonDto = Schemas["RoundComparisonResponse"];
export type PeakGameDto = Schemas["PeakGame"];
export type PeakImpactDto = Schemas["PeakImpact"];
export type GoalReportDto = Schemas["GoalReportResponse"];
export type GoalSaverDto = Schemas["GoalSaver"];
export type FriendshipDto = Schemas["FriendshipResponse"];
export type FriendshipStatusRequestDto = Schemas["FriendshipStatusRequest"];
/** What `PATCH /users/{id}` takes. A field left out keeps its value; null clears it. */
export type UserChangesDto = Schemas["UpdateUserRequest"];

export type AuthUserDto = Schemas["AuthUserResponse"];
export type RegisterDto = Schemas["RegisterResponse"];
export type MessageDto = Schemas["MessageResponse"];

/** What `POST /api/scan/extract` sends back: the card as read, and how sure the scan is of it. */
export type ScanDto = Schemas["ScanResponse"];
export type ScannedRoundDto = Schemas["ScannedRound"];
export type ScannedTeeDto = Schemas["ScannedTee"];
export type ScannedHoleScoreDto = Schemas["ScannedHoleScore"];
export type FieldConfidenceDto = Schemas["FieldConfidence"];
export type OcrTextDto = Schemas["OcrTextResponse"];
export type SaveScanDto = Schemas["SaveScanResponse"];

/** What `POST /api/scan/save` takes: a reviewed scan, and the course details read off the card. */
export type SaveScanRequestDto = Schemas["SaveRoundRequest"];
