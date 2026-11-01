import type { DashboardData, User } from "../../types/golf";
import type { GoalReport } from "../../types/analytics";
import type {
  HandicapTrendRowDto,
  ScoreTrendRowDto,
  ScramblingTrendRowDto,
  UpAndDownTrendRowDto,
} from "../../types/api";
import { populatedRounds } from "./rounds";

/** Five-round window: one used differential, no WHS adjustment. */
const scoreTrend: ScoreTrendRowDto[] = [
  { round_index: 1, round_id: "round-4", total_score: 85, to_par: 13, course_name: "Scanned Scorecard" },
  { round_index: 2, round_id: "round-3", total_score: 69, to_par: -3, course_name: "Blue Rock" },
  { round_index: 3, round_id: "round-2", total_score: 72, to_par: 0, course_name: "Half Moon Bay" },
  { round_index: 4, round_id: "round-1", total_score: 78, to_par: 6, course_name: "Half Moon Bay" },
  { round_index: 5, round_id: "round-5", total_score: 80, to_par: 8, course_name: "Muni" },
];

const handicapTrend: HandicapTrendRowDto[] = scoreTrend.map((row, i) => ({
  round_index: row.round_index,
  round_id: row.round_id,
  handicap_index: 14 - i * 0.4,
  used_in_hi: row.round_id === "round-3",
  differential: [18.2, 4.1, 8.0, 11.5, 13.0][i],
  hi_threshold: 6,
  // 8.0 sits two strokes off the 6 cut-off, so the server reads it as close.
  differential_status: (["out", "counting", "close", "out", "out"] as const)[i],
}));

const scramblingTrend: ScramblingTrendRowDto[] = scoreTrend.map((row) => ({
  round_index: row.round_index,
  round_id: row.round_id,
  scramble_opportunities: 8,
  scramble_successes: 3,
  scramble_failures: 5,
  scrambling_percentage: 37.5,
}));

const upAndDownTrend: UpAndDownTrendRowDto[] = scoreTrend.map((row) => ({
  round_index: row.round_index,
  round_id: row.round_id,
  opportunities: 6,
  successes: 2,
  percentage: 33.3,
}));

export const dashboardUser: User = {
  id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  home_course_id: null,
  handicap: 12.4,
  created_at: null,
  scoring_goal: 79,
};

export const populatedDashboard: DashboardData = {
  total_rounds: 4,
  scoring_average: 76,
  best_round: 69,
  best_round_id: "round-3",
  best_round_course: "Blue Rock",
  handicap_index: 12.4,
  recent_rounds: populatedRounds,
  average_putts: 32,
  average_gir: 8,
  // The figures the server works out from the trend window below.
  scoring_average_l20: 76.8,
  scoring_average_l5: 76.8,
  scoring_average_change: 0,
  handicap_change: { delta: -1.6, direction: "down" },
  recent_form: { gir_pct: (35 / 90) * 100, scrambling_pct: 37.5, up_and_down_pct: 100 / 3, putts_per_18: 32 },
  score_mix: { eagle: 0, birdie: 10, par: 40, bogey: 35, double: 10, triple: 5, quad: 0 },
  recent_score_mix: { eagle: 0, birdie: 10, par: 40, bogey: 35, double: 10, triple: 5, quad: 0 },
  score_mix_holes: 90,
  // Round 3 is a 69 on a par 72 with 28 putts: the first round under par, and under 30 putts.
  milestones: [
    { kind: "under_par", value: 69, date: "2026-04-18", course: "Blue Rock", round_id: "round-3" },
    { kind: "putt_break", value: 30, date: "2026-04-18", course: "Blue Rock", round_id: "round-3" },
  ],
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
    show_calculation: true,
  },
  score_trend: scoreTrend,
  handicap_trend: handicapTrend,
  scrambling_trend: scramblingTrend,
  up_and_down_trend: upAndDownTrend,
};

export const dashboardGoalReport: GoalReport = {
  scoring_average: 76.8,
  best_score: 69,
  scoring_goal: 79,
  gap: 2.2,
  on_track: false,
  progress_pct: 100,
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
