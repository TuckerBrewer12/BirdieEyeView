import { SCORE_KEYS, scoreKindLabel } from "@/brand/theme";
import { formatPercent } from "@/domain/format";
import { scoreKindCountLabel, type ScoreKind, type ScoreMix } from "@/domain/score";

export interface ScoreMixEntry {
  kind: ScoreKind;
  /** "40%", or with `counted` "10". */
  figure: string;
  /** "par", or with `counted` "pars". */
  word: string;
}

/**
 * The kinds a mix has, in score order, each with its figure and word. Slivers under half a percent
 * would only draw as a seam, so the bar, the donut and their legends all skip them.
 */
export function scoreMixEntries(mix: ScoreMix, counted = false): ScoreMixEntry[] {
  return SCORE_KEYS.filter((kind) => mix[kind] > 0.5).map((kind) =>
    counted
      ? { kind, figure: String(mix[kind]), word: scoreKindCountLabel(kind, mix[kind]).toLowerCase() }
      : { kind, figure: formatPercent(mix[kind]), word: scoreKindLabel(kind).toLowerCase() },
  );
}
