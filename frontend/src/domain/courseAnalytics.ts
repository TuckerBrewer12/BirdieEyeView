import type {
  CourseAnalyticsDto,
  CourseHoleDifficultyRowDto,
  CourseHoleScoreTypeRowDto,
  CourseHoleToParRowDto,
  CourseScoreTrendRowDto,
} from "@/types/api";
import { Round, type RoundSummary } from "./round";
import { scoreMixFrom, type ScoreKind } from "./score";

export interface ScorePoint {
  roundIndex: number;
  date: string | null;
  score: number | null;
  toPar: number | null;
}

export interface HoleToPar {
  hole: number;
  averageScore: number;
  averageToPar: number;
}

export type HoleScoreMix = { hole: number; rounds: number } & Record<ScoreKind, number>;

export interface HoleFigure {
  hole: number;
  value: number | null;
}

export interface NineAverages {
  front: number | null;
  back: number | null;
  total: number | null;
}

export interface CourseAnalytics {
  roundsPlayed: number;
  scoringAverage: number | null;
  bestScore: number | null;
  worstScore: number | null;
  rounds: RoundSummary[];
  scoreTrend: ScorePoint[];
  holeToPar: HoleToPar[];
  nineAverages: NineAverages;
  difficulty: HoleToPar[];
  scoreMix: HoleScoreMix[];
  gir: HoleFigure[];
  putts: HoleFigure[];
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
  nineAverages: { front: null, back: null, total: null },
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
