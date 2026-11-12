import type { CourseAnalyticsDto, CourseHoleToParRowDto } from "@/types/api";
import { Round, type RoundSummary } from "./round";

/** A golfer's average score on one hole, and how far over or under par that is. */
export interface HoleToPar {
  hole: number;
  averageScore: number;
  averageToPar: number;
}

/** One figure on one hole: here, the share of greens hit (0-100). */
export interface HoleFigure {
  hole: number;
  value: number | null;
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
  /** In course order. */
  holeToPar: HoleToPar[];
  /** Greens hit per hole, in course order. */
  greens: HoleFigure[];
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
  holeToPar: [],
  greens: [],
  nineToPar: { front: null, back: null, total: null },
  nineGreens: { front: null, back: null, total: null },
};

function holeToPar(row: CourseHoleToParRowDto): HoleToPar {
  return { hole: row.hole_number, averageScore: row.average_score, averageToPar: row.average_to_par };
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
    holeToPar: dto.average_score_relative_to_par_by_hole.map(holeToPar),
    greens: dto.gir_percentage_by_hole.map((row) => ({ hole: row.hole_number, value: row.gir_percentage })),
    nineToPar: { front: dto.hole_to_par_front_nine, back: dto.hole_to_par_back_nine, total: dto.hole_to_par_total },
    nineGreens: { front: dto.gir_front_nine, back: dto.gir_back_nine, total: dto.gir_total },
  };
}
