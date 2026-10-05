import type { DashboardDto, HoleScoreDto, RoundDto, RoundSummaryDto } from "./api";

// Round responses come from the generated API types; see ./api.ts.
export type HoleScore = HoleScoreDto;
export type Round = RoundDto;
export type RoundSummary = RoundSummaryDto;
export type DashboardData = DashboardDto;

export interface Hole {
  number: number | null;
  par: number | null;
  handicap: number | null;
}

export interface Tee {
  color: string | null;
  total_yardage: number | null;
  hole_yardages: Record<number, number>;
  slope_rating: number | null;
  course_rating: number | null;
}

export interface Course {
  id: string | null;
  name: string | null;
  location: string | null;
  par: number | null;
  holes: Hole[];
  tees: Tee[];
}

export interface CourseSummary {
  id: string;
  name: string | null;
  external_course_id?: string | null;
  source?: "local" | "external";
  location: string | null;
  par: number | null;
  total_holes: number;
  tee_count: number;
}

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

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  created_at: string;
  updated_at: string;
  requester_name?: string | null;
  requester_email?: string | null;
  addressee_name?: string | null;
  addressee_email?: string | null;
}

/** Legacy copies for unmigrated pages. New pages use `@/domain` and `@/brand`. */
export type ScoreType = "eagle" | "birdie" | "par" | "bogey" | "double-bogey" | "worse";

export function getScoreType(strokes: number, par: number): ScoreType {
  const diff = strokes - par;
  if (diff <= -2) return "eagle";
  if (diff === -1) return "birdie";
  if (diff === 0) return "par";
  if (diff === 1) return "bogey";
  if (diff === 2) return "double-bogey";
  return "worse";
}

export function getScoreColor(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff <= -2) return "bg-eagle text-white ring-2 ring-yellow-300";
  if (diff === -1) return "bg-birdie text-white";
  if (diff === 0) return "bg-gray-100 text-gray-700";
  if (diff === 1) return "bg-red-400 text-white";
  if (diff === 2) return "bg-blue-500 text-white";
  return "bg-purple-600 text-white";
}

export function formatToPar(toPar: number | null): string {
  if (toPar === null) return "-";
  if (toPar === 0) return "E";
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

/** WHS course handicap: (HI × Slope / 113) + (Course Rating - Par), rounded. */
export function calcCourseHandicap(
  hi: number,
  slope: number,
  courseRating: number,
  par: number,
): number {
  return Math.round((hi * slope) / 113 + (courseRating - par));
}

/** Net score = gross score - course handicap. */
export function calcNetScore(grossScore: number, courseHandicap: number): number {
  return grossScore - courseHandicap;
}
