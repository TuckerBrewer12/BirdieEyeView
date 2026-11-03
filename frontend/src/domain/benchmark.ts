import type {
  BenchmarkComparisonDto,
  BenchmarkShapeDto,
  GoalAttemptDto,
  ParTypeComparisonDto,
} from "@/types/api";

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

export const COMPARISON_HANDICAPS = [0, 5, 10, 15, 20, 25] as const;

export function goalScoreToBreak(target: number): number {
  return target + 1;
}

export function goalTargetLabel(target: number): string {
  return `Break ${goalScoreToBreak(target)}`;
}

export interface GoalAttempt {
  roundId: string | null;
  score: number;
  metGoal: boolean;
}

export function goalAttemptsFrom(dtos: readonly GoalAttemptDto[]): GoalAttempt[] {
  return dtos.map((dto) => ({ roundId: dto.round_id, score: dto.score, metGoal: dto.met_goal }));
}

export interface BenchmarkShape {
  girPct: number | null;
  scramblingPct: number | null;
  puttsPerGir: number | null;
  par3ToPar: number | null;
  par4ToPar: number | null;
  par5ToPar: number | null;
}

export type BenchmarkTarget =
  | { against: "handicap"; handicap: number }
  | { against: "peak" }
  | { against: "friend"; friendId: string };

export type ParTypeVerdict = NonNullable<ParTypeComparisonDto["verdict"]>;

export interface ParTypeComparison {
  par: 3 | 4 | 5;
  averageToPar: number | null;
  benchmarkToPar: number | null;
  gap: number | null;
  verdict: ParTypeVerdict | null;
}

export interface BenchmarkComparison {
  benchmark: BenchmarkShape | null;
  parTypes: ParTypeComparison[];
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
  };
}

export const TOUR_SHORT_GAME = { scrambling: 57, upAndDown: 50 } as const;
