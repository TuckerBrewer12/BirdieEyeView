import type { DifferentialStatus } from "@/domain/handicap";
import { color } from "./tokens";

const DIFFERENTIAL_FILL: Record<DifferentialStatus, string> = {
  counting: color.score.birdie.base,
  close: color.score.eagle.base,
  out: color.destructive,
  unrated: color.score.par.base,
};

export function differentialFill(status: DifferentialStatus): string {
  return DIFFERENTIAL_FILL[status];
}
