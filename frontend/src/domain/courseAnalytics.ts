import type {
  CourseAnalyticsDto,
  CourseHoleDifficultyRowDto,
  CourseHoleScoreTypeRowDto,
  CourseHoleToParRowDto,
  CourseScoreTrendRowDto,
} from "@/types/api";
import { Round, type RoundSummary } from "./round";
import { scoreMixFrom, type ScoreKind } from "./score";

/** One round's score on a trend, oldest first. */
export interface ScorePoint {
  /** The round's place in the golfer's history, unique on the trend. */
  roundIndex: number;
  /** When the round was played, if the card had a date. */
  date: string | null;
  score: number | null;
  toPar: number | null;
}

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

/** A golfer's figures at one course. The server works out every one. */
export interface CourseAnalytics {
  roundsPlayed: number;
  scoringAverage: number | null;
  bestScore: number | null;
  worstScore: number | null;
  /** The golfer's rounds here, newest first. */
  rounds: RoundSummary[];
  /** Every round here, oldest first. Unscored rounds have a null score. */
  scoreTrend: ScorePoint[];
  /** In course order. */
  holeToPar: HoleToPar[];
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
  holeToPar: [],
  difficulty: [],
  scoreMix: [],
  gir: [],
  putts: [],
  variance: [],
};

function scorePoint(row: CourseScoreTrendRowDto): ScorePoint {
  return { roundIndex: row.round_index, date: row.date, score: row.total_score, toPar: row.to_par };
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
    holeToPar: dto.average_score_relative_to_par_by_hole.map(holeToPar),
    difficulty: dto.course_difficulty_profile_by_hole.map(holeToPar),
    scoreMix: dto.score_type_distribution_by_hole.map(scoreMix),
    gir: dto.gir_percentage_by_hole.map((row) => ({ hole: row.hole_number, value: row.gir_percentage })),
    putts: dto.average_putts_by_hole.map((row) => ({ hole: row.hole_number, value: row.average_putts })),
    variance: dto.score_variance_by_hole.map((row) => ({ hole: row.hole_number, value: row.score_std_dev })),
  };
}
