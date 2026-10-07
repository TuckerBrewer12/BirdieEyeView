/**
 * Response types generated from the backend's OpenAPI schema (`api.gen.ts`).
 * Regenerate with `npm run gen:api` after changing an API model; CI fails if they are stale.
 */
import type { components } from "./api.gen";

type Schemas = components["schemas"];

export type HoleDto = Schemas["Hole"];
export type TeeDto = Schemas["TeeResponse"];
export type CourseDto = Schemas["CourseResponse"];
export type UserTeeDto = Schemas["UserTee"];
export type HoleScoreDto = Schemas["HoleScoreResponse"];
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
export type CourseHoleScoreTypeRowDto = Schemas["CourseHoleScoreTypeRow"];
export type CourseHoleGirRowDto = Schemas["CourseHoleGirRow"];
export type CourseHolePuttsRowDto = Schemas["CourseHolePuttsRow"];
export type CourseHoleVarianceRowDto = Schemas["CourseHoleVarianceRow"];
