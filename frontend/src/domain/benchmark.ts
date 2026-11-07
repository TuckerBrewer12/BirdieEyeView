import type {
  BenchmarkComparisonDto,
  BenchmarkShapeDto,
  GoalAttemptDto,
  ParTypeComparisonDto,
} from "@/types/api";

/** Handicap index, no comparison, or a friend's rounds. */
export type ComparisonTargetValue = number | null | "friend";

/** The goal is stored as the highest score that meets it, so 79 means the golfer is out to break 80. */
export function goalScoreToBreak(target: number): number {
  return target + 1;
}

/** A stored goal of 79 reads "Break 80". */
export function goalTargetLabel(target: number): string {
  return `Break ${goalScoreToBreak(target)}`;
}

/** One scored round against the goal, as the server's goal report marked it. */
export interface GoalAttempt {
  roundId: string | null;
  score: number;
  metGoal: boolean;
}

export function goalAttemptsFrom(dtos: readonly GoalAttemptDto[]): GoalAttempt[] {
  return dtos.map((dto) => ({ roundId: dto.round_id, score: dto.score, metGoal: dto.met_goal }));
}

/** A golfer's shape in golf terms: the radar's axes. Null where they have no figure. */
export interface BenchmarkShape {
  girPct: number | null;
  scramblingPct: number | null;
  puttsPerGir: number | null;
  par3ToPar: number | null;
  par4ToPar: number | null;
  par5ToPar: number | null;
}

/** Who The Lab asks the server to hold the golfer up against. */
export type BenchmarkTarget =
  | { against: "handicap"; handicap: number }
  | { against: "peak" }
  | { against: "friend"; friendId: string };

/** Where the golfer's par type stands against the benchmark's, as the server judged it. */
export type ParTypeVerdict = NonNullable<ParTypeComparisonDto["verdict"]>;

/** One par type's average to par, the golfer's against the comparison's. */
export interface ParTypeComparison {
  par: 3 | 4 | 5;
  /** Null with no holes of this par played. */
  averageToPar: number | null;
  /** Null with nothing to compare. */
  benchmarkToPar: number | null;
  /** The golfer's less the benchmark's, to a hundredth: negative is fewer strokes. */
  gap: number | null;
  verdict: ParTypeVerdict | null;
}

/** A handicap the server has a benchmark for, and the goal, as stored, its golfers play to. */
export interface BenchmarkHandicap {
  handicap: number;
  goal: number;
}

/**
 * The server's comparison: the benchmark's shape (null when there is none to draw) and each par
 * type against it, with every goal and handicap it has a benchmark for.
 */
export interface BenchmarkComparison {
  benchmark: BenchmarkShape | null;
  parTypes: ParTypeComparison[];
  /** The goals a golfer can pick, as stored, the highest score first. */
  goals: number[];
  /** The handicaps a golfer can compare with, scratch first. */
  handicaps: BenchmarkHandicap[];
}

export function benchmarkShapeFrom(dto: BenchmarkShapeDto): BenchmarkShape {
  return {
    girPct: dto.gir_percentage,
    scramblingPct: dto.scrambling_percentage,
    puttsPerGir: dto.putts_per_gir,
    par3ToPar: dto.par3_to_par,
    par4ToPar: dto.par4_to_par,
    par5ToPar: dto.par5_to_par,
  };
}

export function benchmarkComparisonFrom(dto: BenchmarkComparisonDto): BenchmarkComparison {
  return {
    benchmark: dto.benchmark ? benchmarkShapeFrom(dto.benchmark) : null,
    parTypes: dto.par_types.map((row) => ({
      par: row.par,
      averageToPar: row.average_to_par,
      benchmarkToPar: row.benchmark_to_par,
      gap: row.gap,
      verdict: row.verdict,
    })),
    goals: dto.goals,
    handicaps: dto.handicaps,
  };
}

/** Tour players' short game, in percent: what the dashboard measures a player's last five rounds against. */
export const TOUR_SHORT_GAME = { scrambling: 57, upAndDown: 50 } as const;
