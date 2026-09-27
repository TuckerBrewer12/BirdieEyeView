/**
 * Response types generated from the backend's OpenAPI schema (`api.gen.ts`).
 * Regenerate with `npm run gen:api` after changing an API model; CI fails if they are stale.
 */
import type { components } from "./api.gen";

type Schemas = components["schemas"];

export type HoleDto = Schemas["Hole"];
export type TeeDto = Schemas["Tee"];
export type CourseDto = Schemas["Course"];
export type UserTeeDto = Schemas["UserTee"];
export type HoleScoreDto = Schemas["HoleScoreResponse"];
export type ScoreCountsDto = Schemas["ScoreCounts"];
export type RoundDto = Schemas["RoundResponse"];
export type RoundSummaryDto = Schemas["RoundSummaryResponse"];
export type DashboardDto = Schemas["DashboardResponse"];
