import type {
  AnalyticsDto,
  BenchmarkComparisonDto,
  BenchmarkShapeDto,
  BenchmarkVerdictsDto,
  GoalAttemptDto,
  GoalReportDto,
  ParTypeComparisonDto,
  UserDto,
} from "../../types/api";
import { withoutRounds } from "../fakes/analyticsResponses";
import { avery, jordan } from "./friendships";
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

/** Which of those rounds the server marks as meeting each goal: only the 89 breaks 90; nine of them break 95. */
const MET_BREAKING_90 = SCORES.map((_, i) => i === 5);
export const MET_BREAKING_95 = [false, true, true, false, true, true, true, true, true, false, true, true];
export const MET_NONE = SCORES.map(() => false);

/** The twelve rounds as the goal report sends them, each marked met or not. */
export function labAttempts(met: boolean[]): GoalAttemptDto[] {
  return SCORES.map((score, i) => ({ round_id: `lab-${i + 1}`, score, met_goal: met[i] }));
}

const pct = (holes: number) => Math.round((holes / 18) * 1000) / 10;

/** The server's response with every series empty; each golfer below fills in what The Lab reads. */
const NO_ROUNDS = withoutRounds(sampleGolfer.analytics);

/**
 * The figures the server works out from those rounds. Holes of each kind a round (birdies,
 * bogeys, doubles or worse): 1, 8 and 3 in the best three (lab-6, lab-5, lab-11), against
 * 9, 110 and 41 holes over all twelve.
 */
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
    // The 89, the best of the twelve.
    best_round: 89,
    best_round_id: "lab-6",
    best_round_course: "Half Moon Bay",
    average_putts: 34.5,
    three_putts_per_round: 2,
    three_putt_rate: 11.1,
    // The last five average 92.2 against 91.67 over all twelve.
    scoring_average_change: 0.5,
    scoring_average_verdict: "bad",
  },
  peak_game: {
    rounds: [
      { round_id: "lab-6", course_name: "Half Moon Bay", score: 89 },
      { round_id: "lab-5", course_name: "Pebble Creek", score: 90 },
      { round_id: "lab-11", course_name: "Muni", score: 90 },
    ],
    average: 89.7,
    impacts: [
      { kind: "birdies", peak: 1.33, average: 0.75, strokes: 0.58 },
      { kind: "bogeys", peak: 8, average: 9.17, strokes: 1.17 },
      { kind: "doubles", peak: 3, average: 3.42, strokes: 0.83 },
    ],
  },
  notable_achievements: {
    ...NO_ROUNDS.notable_achievements,
    scoring_records: {
      ...NO_ROUNDS.notable_achievements.scoring_records,
      lifetime: { ...NO_ROUNDS.notable_achievements.scoring_records.lifetime, lowest_round: 89 },
    },
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
    par: 72,
    rolling_average: null,
  })),
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
    best_round: null,
    best_round_id: null,
    best_round_course: null,
    average_putts: null,
    three_putts_per_round: null,
    three_putt_rate: null,
    scoring_average_change: null,
    scoring_average_verdict: null,
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
  lowest_score: 89,
  gap: 2.7,
  on_track: false,
  progress_pct: 64,
  rounds_meeting_goal: 1,
  // The best three average 89.67, two thirds of a stroke over the goal.
  peak_gap: 0.7,
  peak_meets_goal: false,
  attempts: labAttempts(MET_BREAKING_90),
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

/** The server's shapes: a 15 handicap breaks 90, a 5 breaks 80, and Avery's own figures. */
export const breaks90Shape: BenchmarkShapeDto = {
  gir_percentage: 24,
  scrambling_percentage: 21,
  putts_per_gir: 2.1,
  par3_to_par: 0.6,
  par4_to_par: 1.025,
  par5_to_par: 1.1,
};

const breaks80Shape: BenchmarkShapeDto = {
  gir_percentage: 44,
  scrambling_percentage: 41,
  putts_per_gir: 1.94,
  par3_to_par: 0.2,
  par4_to_par: 0.5,
  par5_to_par: 0.55,
};

const averyShape: BenchmarkShapeDto = {
  gir_percentage: 44,
  scrambling_percentage: 38,
  putts_per_gir: 1.92,
  par3_to_par: 0.35,
  par4_to_par: 0.55,
  par5_to_par: 0.3,
};

/** The golfer's par 3s, 4s and 5s (+0.92, +1.12, +0.85) against a shape's, as the server judged them. */
function parTypes(
  shape: BenchmarkShapeDto | null,
  judged: [number, ParTypeComparisonDto["verdict"]][],
): ParTypeComparisonDto[] {
  const mine = [0.92, 1.12, 0.85];
  return ([3, 4, 5] as const).map((par, i) => ({
    par,
    average_to_par: mine[i],
    benchmark_to_par: shape ? shape[`par${par}_to_par`] : null,
    gap: shape ? judged[i][0] : null,
    verdict: shape ? judged[i][1] : null,
  }));
}

type Verdict = ParTypeComparisonDto["verdict"];

/**
 * The radar's axes as the server judged them: GIR, scrambling and putts per GIR (the golfer's
 * 28%, 22% and 2.05 against the shape's), then each par type's verdict from its row.
 */
function verdicts(rates: [Verdict, Verdict, Verdict], parRows: ParTypeComparisonDto[]): BenchmarkVerdictsDto {
  const [par3, par4, par5] = parRows.map((row) => row.verdict);
  return {
    gir_percentage: rates[0],
    scrambling_percentage: rates[1],
    putts_per_gir: rates[2],
    par3_to_par: par3,
    par4_to_par: par4,
    par5_to_par: par5,
  };
}

const BREAKS_90_JUDGED: [number, ParTypeComparisonDto["verdict"]][] = [[0.32, "behind"], [0.1, "behind"], [-0.25, "ahead"]];

/** `GET /stats/{id}/benchmark` for each comparison The Lab's tests make, keyed as FakeBackend looks them up. */
export const labBenchmarks: Record<string, BenchmarkComparisonDto> = {
  "handicap:15": {
    against: "handicap",
    handicap: 15,
    goal: null,
    benchmark: breaks90Shape,
    par_types: parTypes(breaks90Shape, BREAKS_90_JUDGED),
    verdicts: verdicts(["ahead", "ahead", "ahead"], parTypes(breaks90Shape, BREAKS_90_JUDGED)),
  },
  "handicap:5": {
    against: "handicap",
    handicap: 5,
    goal: null,
    benchmark: breaks80Shape,
    par_types: parTypes(breaks80Shape, [[0.72, "behind"], [0.62, "behind"], [0.3, "behind"]]),
    verdicts: verdicts(
      ["behind", "behind", "behind"],
      parTypes(breaks80Shape, [[0.72, "behind"], [0.62, "behind"], [0.3, "behind"]]),
    ),
  },
  // The best three average 89.7, nearest the golfers who break 90.
  peak: {
    against: "peak",
    handicap: null,
    goal: 89,
    benchmark: breaks90Shape,
    par_types: parTypes(breaks90Shape, BREAKS_90_JUDGED),
    verdicts: verdicts(["ahead", "ahead", "ahead"], parTypes(breaks90Shape, BREAKS_90_JUDGED)),
  },
  [`friend:${avery.id}`]: {
    against: "friend",
    handicap: null,
    goal: null,
    benchmark: averyShape,
    par_types: parTypes(averyShape, [[0.57, "behind"], [0.57, "behind"], [0.55, "behind"]]),
    verdicts: verdicts(
      ["behind", "behind", "behind"],
      parTypes(averyShape, [[0.57, "behind"], [0.57, "behind"], [0.55, "behind"]]),
    ),
  },
  // Jordan has no rounds: nothing to draw or compare with.
  [`friend:${jordan.id}`]: {
    against: "friend",
    handicap: null,
    goal: null,
    benchmark: null,
    par_types: parTypes(null, []),
    verdicts: verdicts([null, null, null], parTypes(null, [])),
  },
};
