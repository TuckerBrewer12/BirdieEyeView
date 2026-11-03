import type { DifferentialStatus } from "@/domain/handicap";
import { colors } from "./colors";

const DIFFERENTIAL_FILL: Record<DifferentialStatus, string> = {
  counting: colors.score.birdie.base,
  close: colors.score.eagle.base,
  out: colors.destructive,
  unrated: colors.score.par.base,
};

export function differentialFill(status: DifferentialStatus): string {
  return DIFFERENTIAL_FILL[status];
}
