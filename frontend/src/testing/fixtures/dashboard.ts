import type {
  DashboardDto,
  GoalReportDto,
  HandicapTrendRowDto,
  ScoreTrendRowDto,
  UserDto,
} from "../../types/api";
import { populatedRounds } from "./rounds";
import { countsFor } from "./scoreCounts";

const scoreTrend: ScoreTrendRowDto[] = [
  { round_index: 1, round_id: "round-4", total_score: 85, to_par: 13, par: 72, rolling_average: 85, course_name: "Scanned Scorecard", score_counts: countsFor(13) },
  { round_index: 2, round_id: "round-3", total_score: 69, to_par: -3, par: 72, rolling_average: 77, course_name: "Blue Rock", score_counts: countsFor(-3) },
  { round_index: 3, round_id: "round-2", total_score: 72, to_par: 0, par: 72, rolling_average: 75.3, course_name: "Half Moon Bay", score_counts: countsFor(0) },
  { round_index: 4, round_id: "round-1", total_score: 78, to_par: 6, par: 72, rolling_average: 76, course_name: "Half Moon Bay", score_counts: countsFor(6) },
  { round_index: 5, round_id: "round-5", total_score: 80, to_par: 8, par: 72, rolling_average: 76.8, course_name: "Muni", score_counts: countsFor(8) },
];

const handicapTrend: HandicapTrendRowDto[] = scoreTrend.map((row, i) => ({
  round_index: row.round_index,
  round_id: row.round_id,
  handicap_index: 14 - i * 0.4,
  used_in_hi: row.round_id === "round-3",
  differential: [18.2, 4.1, 8.0, 11.5, 13.0][i],
  hi_threshold: 6,
  differential_status: (["out", "counting", "close", "out", "out"] as const)[i],
  in_window: true,
}));

export const dashboardUser: UserDto = {
  id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  friend_code: null,
  home_course_id: null,
  handicap: 12.4,
  created_at: null,
  scoring_goal: 79,
};

export const populatedDashboard: DashboardDto = {
  best_round: 69,
  best_round_id: "round-3",
  best_round_course: "Blue Rock",
  best_round_to_par: -3,
  best_round_date: "2026-04-18T18:00:00.000Z",
  handicap_index: 12.4,
  recent_rounds: populatedRounds,
  scoring_average_l5: 74.7,
  scoring_average_change: -2.1,
  scoring_average_verdict: "good",
  handicap_change: { this_month: -1.6, this_month_verdict: "good" },
  recent_score_mix: { eagle: 0, birdie: 10, par: 40, bogey: 35, double: 10, triple: 5, quad: 0 },
  whs: {
    rows: [
      { round_index: 5, course_name: "Muni", course_rating: 72.4, slope_rating: 130, score: 80, differential: 13, used: false },
      { round_index: 4, course_name: "Half Moon Bay", course_rating: 72.4, slope_rating: 130, score: 78, differential: 11.5, used: false },
      { round_index: 3, course_name: "Half Moon Bay", course_rating: 72.4, slope_rating: 130, score: 72, differential: 8, used: false },
      { round_index: 2, course_name: "Blue Rock", course_rating: 72.4, slope_rating: 130, score: 69, differential: 4.1, used: true },
      { round_index: 1, course_name: "Scanned Scorecard", course_rating: 72.4, slope_rating: 130, score: 85, differential: 18.2, used: false },
    ],
    window_size: 5,
    count_used: 1,
    adjustment: 0,
    diff_avg: 4.1,
    has_rated_rounds: true,
  },
  score_trend: scoreTrend,
  handicap_trend: handicapTrend,
  rounds_this_year: 4,
};

export const dashboardGoalReport: GoalReportDto = {
  scoring_average: 76.8,
  lowest_score: 69,
  scoring_goal: 79,
  gap: -2.2,
  on_track: true,
  progress_pct: 82,
  rounds_meeting_goal: 3,
  peak_gap: -6,
  peak_meets_goal: true,
  attempts: [
    { round_id: "round-4", score: 85, met_goal: false },
    { round_id: "round-3", score: 69, met_goal: true },
    { round_id: "round-2", score: 72, met_goal: true },
    { round_id: "round-1", score: 78, met_goal: true },
    { round_id: "round-5", score: 80, met_goal: false },
  ],
  savers: [
    {
      type: "three_putt_bleed",
      strokes_saved: 1.4,
      percentage_of_gap: 64,
      headline: "Fewer three-putts",
      detail: "Cut three-putts in half.",
      data: {},
    },
  ],
};
