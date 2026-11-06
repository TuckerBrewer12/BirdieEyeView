import type { DifferentialStatus } from "@/domain/handicap";
import { color } from "./tokens";

const DIFFERENTIAL_FILL: Record<DifferentialStatus, string> = {
  counting: color.score.birdie.base,
  close: color.score.eagle.base,
  out: color.destructive,
  unrated: color.score.par.base,
};

/** The bar colour for a round's differential, from where it stands in the WHS window. */
export function differentialFill(status: DifferentialStatus): string {
  return DIFFERENTIAL_FILL[status];
}
