import type { AnalyticsDto, GoalReportDto, ScoreTypeRowDto, UserDto } from "../../types/api";
import { withoutRounds } from "../fakes/analyticsResponses";
import { avery } from "./friendships";
import { sampleGolfer } from "./sampleGolfer";

/** A 17.8 out to break 90: met it once in twelve rounds, three-putts the worst leak. */
export const labUser: UserDto = {
  id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  friend_code: null,
  home_course_id: null,
  handicap: 17.8,
  created_at: null,
  scoring_goal: 89,
};

const COURSES = ["Pebble Creek", "Half Moon Bay", "Muni", "Blue Rock"];
const SCORES = [97, 93, 91, 95, 90, 89, 94, 92, 91, 96, 90, 92];
const THREE_PUTTS = [3, 2, 2, 3, 1, 1, 2, 2, 1, 3, 2, 2];
const PUTTS = [36, 35, 34, 37, 33, 32, 35, 34, 33, 36, 34, 35];
/** Holes a round of each kind: eagle, birdie, par, bogey, double, triple, quad. */
const MIXES: number[][] = [
  [0, 0, 4, 9, 4, 1, 0],
  [0, 1, 4, 10, 3, 0, 0],
  [0, 1, 5, 9, 3, 0, 0],
  [0, 0, 4, 10, 3, 1, 0],
  [0, 1, 6, 8, 3, 0, 0],
  [0, 2, 5, 8, 3, 0, 0],
  [0, 0, 5, 9, 3, 1, 0],
  [0, 1, 4, 10, 3, 0, 0],
  [0, 1, 5, 10, 2, 0, 0],
  [0, 0, 4, 9, 4, 1, 0],
  [0, 1, 6, 8, 3, 0, 0],
  [0, 1, 4, 10, 3, 0, 0],
];

const pct = (holes: number) => Math.round((holes / 18) * 1000) / 10;

function scoreTypes(i: number): ScoreTypeRowDto {
  const [eagle, birdie, par, bogey, double, triple, quad] = MIXES[i].map(pct);
  return {
    round_index: i + 1,
    round_id: `lab-${i + 1}`,
    holes_counted: 18,
    eagle,
    birdie,
    par,
    bogey,
    double_bogey: double,
    triple_bogey: triple,
    quad_bogey: quad,
  };
}

/** The server's response with every series empty; each golfer below fills in what The Lab reads. */
const NO_ROUNDS = withoutRounds(sampleGolfer.analytics);

export const labAnalytics: AnalyticsDto = {
  ...NO_ROUNDS,
  kpis: {
    scoring_average: 91.7,
    handicap_index: 17.8,
    gir_percentage: 28,
    scrambling_percentage: 22,
    up_and_down_percentage: 30,
    putts_per_gir: 2.05,
    total_rounds: SCORES.length,
    average_putts: null,
  },
  scoring_by_par: [
    { par: 3, average_to_par: 0.92, average_strokes: 3.92, sample_size: 48 },
    { par: 4, average_to_par: 1.12, average_strokes: 5.12, sample_size: 120 },
    { par: 5, average_to_par: 0.85, average_strokes: 5.85, sample_size: 48 },
  ],
  score_trend: SCORES.map((score, i) => ({
    round_index: i + 1,
    round_id: `lab-${i + 1}`,
    course_name: COURSES[i % COURSES.length],
    total_score: score,
    to_par: score - 72,
    rolling_average: null,
  })),
  score_type_distribution: SCORES.map((_, i) => scoreTypes(i)),
  three_putts_trend: THREE_PUTTS.map((count, i) => ({
    round_index: i + 1,
    round_id: `lab-${i + 1}`,
    three_putt_count: count,
    three_putt_percentage: pct(count),
    holes_with_putt_data: 18,
  })),
  putts_trend: PUTTS.map((putts, i) => ({
    round_index: i + 1,
    round_id: `lab-${i + 1}`,
    total_putts: putts,
    holes_played: 18,
  })),
};

/** Avery plays to about 81: more greens, better par 3s. Jordan has no rounds. */
export const averyLabAnalytics: AnalyticsDto = {
  ...NO_ROUNDS,
  kpis: {
    scoring_average: 81.2,
    handicap_index: 8.4,
    gir_percentage: 44,
    scrambling_percentage: 38,
    up_and_down_percentage: 41,
    putts_per_gir: 1.92,
    total_rounds: 8,
    average_putts: null,
  },
  scoring_by_par: [
    { par: 3, average_to_par: 0.35, average_strokes: 3.35, sample_size: 32 },
    { par: 4, average_to_par: 0.55, average_strokes: 4.55, sample_size: 80 },
    { par: 5, average_to_par: 0.3, average_strokes: 5.3, sample_size: 32 },
  ],
};

/** Analytics by golfer, as FakeBackend serves them. */
export const labAnalyticsByGolfer: Record<string, AnalyticsDto> = {
  "user-1": labAnalytics,
  [avery.id]: averyLabAnalytics,
};

export const labGoalReport: GoalReportDto = {
  scoring_goal: 89,
  scoring_average: 91.7,
  best_score: 89,
  gap: 2.7,
  on_track: false,
  progress_pct: 64,
  savers: [
    {
      type: "three_putt_bleed",
      strokes_saved: 1.2,
      percentage_of_gap: 44,
      headline: "You average 2.0 three-putts a round",
      detail: "Halving them would save about 1.2 strokes a round.",
      data: {},
    },
    {
      type: "blowup_holes",
      strokes_saved: 0.9,
      percentage_of_gap: 33,
      headline: "3.6 holes a round end in double bogey or worse",
      detail: "Turning one of them into a bogey saves about 0.9 strokes.",
      data: {},
    },
    {
      type: "gir_opportunity",
      strokes_saved: 0.6,
      percentage_of_gap: 22,
      headline: "You hit 28% of greens in regulation",
      detail: "Two more greens a round is worth about 0.6 strokes.",
      data: {},
    },
  ],
};
