import { GOAL_THRESHOLDS } from "@/domain/benchmark";

export type { BenchmarkProfile } from "@/domain/benchmark";
export { GOAL_BENCHMARK, HANDICAP_BENCHMARK } from "@/domain/benchmark";

const GOAL_LABELS: Record<(typeof GOAL_THRESHOLDS)[number], string> = {
  99: "Break 100",
  94: "Break 95",
  89: "Break 90",
  84: "Break 85",
  79: "Break 80",
  74: "Break 75",
  71: "Break 72",
};

export const GOAL_OPTIONS = GOAL_THRESHOLDS.map((value) => ({
  label: GOAL_LABELS[value],
  value,
}));
