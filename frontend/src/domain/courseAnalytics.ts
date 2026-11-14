import type { CourseAnalyticsDto, CourseHoleStatsRowDto } from "@/types/api";
import { Round, type RoundSummary } from "./round";
import type { ScoreMix } from "./score";
import { trendPointsFrom, type RoundTrendPoint } from "./trend";

export type PuttsVerdict = NonNullable<CourseHoleStatsRowDto["putts_verdict"]>;

export interface HoleStats {
  hole: number;
  par: number;
  rounds: number;
  averageScore: number;
  averageToPar: number;
  difficultyRank: number;
  spread: number | null;
  greens: number | null;
  putts: number | null;
  puttsVerdict: PuttsVerdict | null;
  mix: ScoreMix;
}

export interface NineFigures {
  front: number | null;
  back: number | null;
  total: number | null;
}

export interface CourseAnalytics {
  roundsPlayed: number;
  lastPlayed: string | null;
  scoringAverage: number | null;
  scoringAverageToPar: number | null;
  bestRound: RoundSummary | null;
  worstRound: RoundSummary | null;
  rounds: RoundSummary[];
  scoreTrend: RoundTrendPoint[];
  holes: HoleStats[];
  nineToPar: NineFigures;
  nineGreens: NineFigures;
}

export const EMPTY_COURSE_ANALYTICS: CourseAnalytics = {
  roundsPlayed: 0,
  lastPlayed: null,
  scoringAverage: null,
  scoringAverageToPar: null,
  bestRound: null,
  worstRound: null,
  rounds: [],
  scoreTrend: [],
  holes: [],
  nineToPar: { front: null, back: null, total: null },
  nineGreens: { front: null, back: null, total: null },
};

function holeStats(row: CourseHoleStatsRowDto): HoleStats {
  return {
    hole: row.hole_number,
    par: row.par,
    rounds: row.sample_size,
    averageScore: row.average_score,
    averageToPar: row.average_to_par,
    difficultyRank: row.difficulty_rank,
    spread: row.score_std_dev,
    greens: row.gir_percentage,
    putts: row.average_putts,
    puttsVerdict: row.putts_verdict,
    mix: row.score_mix,
  };
}

export function courseAnalyticsFrom(dto: CourseAnalyticsDto): CourseAnalytics {
  const rounds = dto.rounds.map(Round.fromSummary);
  const byId = (id: string | null) => (id == null ? null : (rounds.find((round) => round.id === id) ?? null));
  return {
    roundsPlayed: dto.rounds_played,
    lastPlayed: dto.last_played,
    scoringAverage: dto.scoring_average,
    scoringAverageToPar: dto.scoring_average_to_par,
    bestRound: byId(dto.best_round_id),
    worstRound: byId(dto.worst_round_id),
    rounds,
    scoreTrend: trendPointsFrom({ score_trend: dto.score_trend, handicap_trend: [] }),
    holes: dto.holes.map(holeStats),
    nineToPar: { front: dto.hole_to_par_front_nine, back: dto.hole_to_par_back_nine, total: dto.hole_to_par_total },
    nineGreens: { front: dto.gir_front_nine, back: dto.gir_back_nine, total: dto.gir_total },
  };
}
