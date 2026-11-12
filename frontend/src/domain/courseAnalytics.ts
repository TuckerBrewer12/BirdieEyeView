import type { CourseAnalyticsDto, CourseHoleStatsRowDto } from "@/types/api";
import { Round, type RoundSummary } from "./round";
import type { ScoreMix } from "./score";
import { trendPointsFrom, type RoundTrendPoint } from "./trend";

/** How one hole of a course plays for the golfer, every figure the server's. */
export interface HoleStats {
  hole: number;
  par: number;
  /** The rounds they've scored it in. */
  rounds: number;
  averageScore: number;
  averageToPar: number;
  /** How far their score swings on it (a standard deviation); null under two rounds. */
  spread: number | null;
  /** The greens they've hit on it, 0-100; null when none was recorded. */
  greens: number | null;
  /** Their average putts on it; null when none were recorded. */
  putts: number | null;
  /** The share of each kind of score on it, 0-100. */
  mix: ScoreMix;
}

/** A figure over the front nine, the back nine and the course, as the server added it. Null for a nine with nothing recorded. */
export interface NineFigures {
  front: number | null;
  back: number | null;
  total: number | null;
}

export interface CourseAnalytics {
  roundsPlayed: number;
  /** The day of their latest round here. */
  lastPlayed: string | null;
  /** Over their full rounds here, or their nines when they have no full round. */
  scoringAverage: number | null;
  scoringAverageToPar: number | null;
  /** The rounds the list ranks best and worst here, from `rounds`. */
  bestRound: RoundSummary | null;
  worstRound: RoundSummary | null;
  /** The golfer's rounds here, newest first. */
  rounds: RoundSummary[];
  /** The rounds the record counts, oldest first, each with its five-round average. */
  scoreTrend: RoundTrendPoint[];
  /** In course order. */
  holes: HoleStats[];
  /** The holes' averages to par summed by nine: the scorecard's Out, In and Tot. */
  nineToPar: NineFigures;
  /** The greens hit over each nine, as a share. */
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
    spread: row.score_std_dev,
    greens: row.gir_percentage,
    putts: row.average_putts,
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
