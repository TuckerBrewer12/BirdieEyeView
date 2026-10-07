import type { DifferentialStatus } from "@/domain/handicap";
import { colors } from "./colors";

const DIFFERENTIAL_FILL: Record<DifferentialStatus, string> = {
  counting: colors.score.birdie.base,
  close: colors.score.eagle.base,
  out: colors.destructive,
  unrated: colors.score.par.base,
};

/** The bar colour for a round's differential, from where it stands in the WHS window. */
export function differentialFill(status: DifferentialStatus): string {
  return DIFFERENTIAL_FILL[status];
}
