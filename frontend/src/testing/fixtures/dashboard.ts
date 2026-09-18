import type { DashboardData, RoundSummary, User } from "../../types/golf";
import type {
  AnalyticsData,
  GoalReport,
  HandicapTrendRow,
  NotableAchievements,
  ScoreDifferentialRow,
  ScoreTrendRow,
} from "../../types/analytics";
import { populatedRounds } from "./rounds";
import { halfMoonBayRound, roundFromSummary } from "./roundDetails";

function emptyNotable(): NotableAchievements {
  const none = { lifetime: {}, one_year: {} };
  return {
    scoring_records: none,
    scoring_records_events: { lifetime: {}, one_year: {} },
    career_totals: { lifetime: {}, one_year: {} },
    best_performance_streaks: { lifetime: {}, one_year: {} },
    best_performance_streaks_events: { lifetime: {}, one_year: {} },
    home_course_records: {
      lifetime: {
        home_course_name: null,
        lowest_score_on_home_course: null,
        most_rounds_played_at_home_course: 0,
      },
      one_year: { home_course_name: null, lowest_score_on_home_course: null },
    },
    home_course_records_events: {
      lifetime: { lowest_score_on_home_course: null },
      one_year: { lowest_score_on_home_course: null },
    },
    putting_milestones: {
      lifetime: {
        fewest_putts_in_round: null,
        most_1_putts_in_round: null,
        most_3_putts_in_round: null,
        putt_breaks: [],
      },
      one_year: {
        fewest_putts_in_round: null,
        most_1_putts_in_round: null,
        most_3_putts_in_round: null,
        putting_milestones_achieved_from_lifetime_set: 0,
      },
    },
    putting_milestones_events: {
      lifetime: {
        fewest_putts_in_round: null,
        most_1_putts_in_round: null,
        most_3_putts_in_round: null,
      },
      one_year: {
        fewest_putts_in_round: null,
        most_1_putts_in_round: null,
        most_3_putts_in_round: null,
      },
    },
    gir_milestones: {
      lifetime: {
        gir_breaks: [],
        highest_gir_percentage_in_round: null,
        most_gir_in_round: null,
      },
      one_year: {
        best_gir_round: null,
        best_gir_in_round: null,
        highest_gir_percentage: null,
        gir_milestones_achieved_from_lifetime_set: 0,
      },
    },
    gir_milestones_events: {
      lifetime: {
        highest_gir_percentage_in_round: null,
        most_gir_in_round: null,
      },
      one_year: { best_gir_round: null, highest_gir_percentage: null },
    },
    round_milestones: {
      lifetime: {
        score_breaks: [],
        first_round_under_par: null,
        first_eagle: null,
        first_hole_in_one: null,
      },
      one_year: {
        new_personal_records_achieved_count: 0,
        new_personal_records_achieved: [],
      },
    },
    window_days: 365,
  };
}

export function emptyAnalytics(overrides: Partial<AnalyticsData> = {}): AnalyticsData {
  return {
    kpis: {
      scoring_average: null,
      gir_percentage: null,
      putts_per_gir: null,
      scrambling_percentage: null,
      up_and_down_percentage: null,
      handicap_index: null,
      total_rounds: 0,
    },
    score_trend: [],
    net_score_trend: [],
    gir_trend: [],
    putts_trend: [],
    three_putts_trend: [],
    scrambling_trend: [],
    up_and_down_trend: [],
    score_type_distribution: [],
    scoring_by_par: [],
    scoring_by_yardage: [],
    scoring_by_handicap: [],
    gir_vs_non_gir: [],
    handicap_trend: [],
    score_differentials: [],
    notable_achievements: emptyNotable(),
    ...overrides,
  };
}

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
};

/** Five-round window: one used differential, no WHS adjustment. */
const scoreTrend: ScoreTrendRow[] = [
  { round_index: 1, round_id: "round-4", total_score: 85, to_par: 13, course_name: "Scanned Scorecard" },
  { round_index: 2, round_id: "round-3", total_score: 69, to_par: -3, course_name: "Blue Rock" },
  { round_index: 3, round_id: "round-2", total_score: 72, to_par: 0, course_name: "Half Moon Bay" },
  { round_index: 4, round_id: "round-1", total_score: 78, to_par: 6, course_name: "Half Moon Bay" },
  { round_index: 5, round_id: "round-5", total_score: 80, to_par: 8, course_name: "Muni" },
];

const handicapTrend: HandicapTrendRow[] = scoreTrend.map((row, i) => ({
  round_index: row.round_index,
  round_id: row.round_id,
  handicap_index: 14 - i * 0.4,
  used_in_hi: row.round_id === "round-3",
  differential: [18.2, 4.1, 8.0, 11.5, 13.0][i],
  hi_threshold: 6,
}));

const scoreDifferentials: ScoreDifferentialRow[] = scoreTrend.map((row, i) => ({
  round_index: row.round_index,
  round_id: row.round_id,
  score: row.total_score,
  course_rating: 72.4,
  slope_rating: 130,
  differential: handicapTrend[i]?.differential ?? null,
}));

export const populatedAnalytics = emptyAnalytics({
  kpis: {
    scoring_average: 76.8,
    gir_percentage: 42,
    putts_per_gir: 1.9,
    scrambling_percentage: 40,
    up_and_down_percentage: 35,
    handicap_index: 12.4,
    total_rounds: 5,
  },
  score_trend: scoreTrend,
  handicap_trend: handicapTrend,
  score_differentials: scoreDifferentials,
  gir_trend: scoreTrend.map((row) => ({
    round_index: row.round_index,
    round_id: row.round_id,
    total_gir: 7,
    holes_played: 18,
    gir_percentage: 39,
  })),
  putts_trend: scoreTrend.map((row) => ({
    round_index: row.round_index,
    round_id: row.round_id,
    total_putts: 32,
    holes_played: 18,
  })),
  scrambling_trend: scoreTrend.map((row) => ({
    round_index: row.round_index,
    round_id: row.round_id,
    scramble_opportunities: 8,
    scramble_successes: 3,
    scrambling_percentage: 37.5,
  })),
  up_and_down_trend: scoreTrend.map((row) => ({
    round_index: row.round_index,
    round_id: row.round_id,
    opportunities: 6,
    successes: 2,
    percentage: 33.3,
  })),
  score_type_distribution: scoreTrend.map((row) => ({
    round_index: row.round_index,
    round_id: row.round_id,
    holes_counted: 18,
    eagle: 0,
    birdie: 10,
    par: 40,
    bogey: 35,
    double_bogey: 10,
    triple_bogey: 5,
    quad_bogey: 0,
  })),
});

export const dashboardGoalReport: GoalReport = {
  scoring_average: 76.8,
  best_score: 69,
  scoring_goal: 79,
  gap: 2.2,
  on_track: false,
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

export function detailRoundsFrom(summaries: RoundSummary[]) {
  return summaries.map((s) => roundFromSummary(s));
}

export const dashboardDetailRounds = [
  ...detailRoundsFrom(populatedRounds),
  halfMoonBayRound,
];
