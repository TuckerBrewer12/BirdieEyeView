import type {
  BenchmarkComparisonDto,
  BenchmarkShapeDto,
  BenchmarkVerdictsDto,
  GoalAttemptDto,
  ParTypeComparisonDto,
} from "@/types/api";

/** Handicap index, no comparison, or a friend's rounds. */
export type ComparisonTargetValue = number | null | "friend";

export const GOAL_OPTIONS = [
  { label: "Break 100", value: 99 },
  { label: "Break 95",  value: 94 },
  { label: "Break 90",  value: 89 },
  { label: "Break 85",  value: 84 },
  { label: "Break 80",  value: 79 },
  { label: "Break 75",  value: 74 },
  { label: "Break 72",  value: 71 },
] as const;

/** The handicaps a golfer can hold their shape up against. The server has a benchmark for each. */
export const COMPARISON_HANDICAPS = [0, 5, 10, 15, 20, 25] as const;

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

/** Who Profile asks the server to hold the golfer up against. */
export type BenchmarkTarget =
  | { against: "handicap"; handicap: number }
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

/** Ahead of the benchmark, level with it, or behind it, as the server judged. */
export type BenchmarkVerdict = NonNullable<BenchmarkVerdictsDto["gir_percentage"]>;

/** The server's verdict on each radar axis. Null where either side has no figure. */
export type BenchmarkVerdicts = Record<keyof BenchmarkShape, BenchmarkVerdict | null>;

/** The server's comparison: the benchmark's shape (null when there is none to draw), each par type against it, and each radar axis's verdict. */
export interface BenchmarkComparison {
  benchmark: BenchmarkShape | null;
  parTypes: ParTypeComparison[];
  verdicts: BenchmarkVerdicts;
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
    verdicts: {
      girPct: dto.verdicts.gir_percentage,
      scramblingPct: dto.verdicts.scrambling_percentage,
      puttsPerGir: dto.verdicts.putts_per_gir,
      par3ToPar: dto.verdicts.par3_to_par,
      par4ToPar: dto.verdicts.par4_to_par,
      par5ToPar: dto.verdicts.par5_to_par,
    },
    parTypes: parTypesFrom(dto.par_types),
  };
}

/** The server's par type rows, each the golfer's against a benchmark's. */
export function parTypesFrom(rows: readonly ParTypeComparisonDto[]): ParTypeComparison[] {
  return rows.map((row) => ({
    par: row.par,
    averageToPar: row.average_to_par,
    benchmarkToPar: row.benchmark_to_par,
    gap: row.gap,
    verdict: row.verdict,
  }));
}

/** A handicap benchmark by name: "Scratch" for 0, else "10 handicap". */
export function handicapName(handicap: number): string {
  return handicap === 0 ? "Scratch" : `${handicap} handicap`;
}
