import type {
  CourseAnalyticsDto,
  CourseHoleDifficultyRowDto,
  CourseHoleScoreTypeRowDto,
  CourseHoleToParRowDto,
  CourseScoreTrendRowDto,
} from "@/types/api";
import { Round, type RoundSummary } from "./round";
import { scoreMixFrom, type ScoreKind } from "./score";
import type { RoundTrendPoint } from "./trend";

/** A golfer's average score on one hole, and how far over or under par that is. */
export interface HoleToPar {
  hole: number;
  averageScore: number;
  averageToPar: number;
}

/** How a hole tends to go: the share of rounds (0-100) ending in each kind of score. */
export type HoleScoreMix = { hole: number; rounds: number } & Record<ScoreKind, number>;

/** One figure on one hole: a GIR rate, average putts, or how far the score swings. */
export interface HoleFigure {
  hole: number;
  /** Null when the server couldn't work it out (too few rounds for a spread). */
  value: number | null;
}

/** The golfer's average strokes summed over the front nine, the back nine and the course. */
export interface NineAverages {
  front: number | null;
  back: number | null;
  total: number | null;
}

/** A golfer's figures at one course. The server works out every one. */
export interface CourseAnalytics {
  roundsPlayed: number;
  scoringAverage: number | null;
  bestScore: number | null;
  worstScore: number | null;
  /** The golfer's rounds here, newest first. */
  rounds: RoundSummary[];
  /** Every round here, oldest first, with the server's five-round average. Unscored rounds have a null score. */
  scoreTrend: RoundTrendPoint[];
  /** The last five scored rounds' average, and it less the first five's (null under ten scored rounds). */
  recentAverage: number | null;
  recentAverageChange: number | null;
  /** In course order. */
  holeToPar: HoleToPar[];
  /** The per-hole averages summed over each nine and every hole, as the server added them. Null for a nine not played. */
  nineAverages: NineAverages;
  /** Hardest hole first. */
  difficulty: HoleToPar[];
  scoreMix: HoleScoreMix[];
  gir: HoleFigure[];
  putts: HoleFigure[];
  /** Least consistent hole first. */
  variance: HoleFigure[];
}

export const EMPTY_COURSE_ANALYTICS: CourseAnalytics = {
  roundsPlayed: 0,
  scoringAverage: null,
  bestScore: null,
  worstScore: null,
  rounds: [],
  scoreTrend: [],
  recentAverage: null,
  recentAverageChange: null,
  holeToPar: [],
  nineAverages: { front: null, back: null, total: null },
  difficulty: [],
  scoreMix: [],
  gir: [],
  putts: [],
  variance: [],
};

/** A round on the course's score trend. One course's rounds say nothing about the handicap. */
function scorePoint(row: CourseScoreTrendRowDto): RoundTrendPoint {
  return {
    roundIndex: row.round_index,
    score: row.total_score,
    toPar: row.to_par,
    par: row.par,
    rollingAverage: row.rolling_average,
    handicapIndex: null,
    courseName: null,
    differentialStatus: "unrated",
  };
}

function holeToPar(row: CourseHoleToParRowDto | CourseHoleDifficultyRowDto): HoleToPar {
  return { hole: row.hole_number, averageScore: row.average_score, averageToPar: row.average_to_par };
}

function scoreMix(row: CourseHoleScoreTypeRowDto): HoleScoreMix {
  return { hole: row.hole_number, rounds: row.sample_size, ...scoreMixFrom(row) };
}

export function courseAnalyticsFrom(dto: CourseAnalyticsDto): CourseAnalytics {
  return {
    roundsPlayed: dto.rounds_played,
    scoringAverage: dto.scoring_average,
    bestScore: dto.best_score,
    worstScore: dto.worst_score,
    rounds: dto.rounds.map(Round.fromSummary),
    scoreTrend: dto.score_trend_on_course.map(scorePoint),
    recentAverage: dto.recent_average,
    recentAverageChange: dto.recent_average_change,
    holeToPar: dto.average_score_relative_to_par_by_hole.map(holeToPar),
    nineAverages: {
      front: dto.hole_averages_front_nine,
      back: dto.hole_averages_back_nine,
      total: dto.hole_averages_total,
    },
    difficulty: dto.course_difficulty_profile_by_hole.map(holeToPar),
    scoreMix: dto.score_type_distribution_by_hole.map(scoreMix),
    gir: dto.gir_percentage_by_hole.map((row) => ({ hole: row.hole_number, value: row.gir_percentage })),
    putts: dto.average_putts_by_hole.map((row) => ({ hole: row.hole_number, value: row.average_putts })),
    variance: dto.score_variance_by_hole.map((row) => ({ hole: row.hole_number, value: row.score_std_dev })),
  };
}
