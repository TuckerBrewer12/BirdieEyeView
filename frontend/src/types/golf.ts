import type {
  CourseDto,
  CourseSummaryDto,
  DashboardDto,
  HoleDto,
  HoleScoreDto,
  RoundDto,
  RoundSummaryDto,
  TeeDto,
} from "./api";

// Round and course responses come from the generated API types; see ./api.ts.
export type HoleScore = HoleScoreDto;
export type Round = RoundDto;
export type RoundSummary = RoundSummaryDto;
export type DashboardData = DashboardDto;
export type Hole = HoleDto;
export type Tee = TeeDto;
export type Course = CourseDto;

export type CourseSummary = CourseSummaryDto;

export interface UserTee {
  id: string | null;
  name: string | null;
  slope_rating: number | null;
  course_rating: number | null;
  hole_yardages: Record<number, number>;
}

export interface User {
  id: string | null;
  friend_code?: string | null;
  name: string | null;
  email: string | null;
  home_course_id: string | null;
  handicap: number | null;
  created_at: string | null;
  scoring_goal?: number | null;
}
