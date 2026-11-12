import { SCORE_KEYS, scoreKindLabel } from "@/brand/theme";
import { formatPercent } from "@/domain/format";
import { FOLDED_SCORE_KINDS, foldedCount, foldedKindLabel, scoreKindCountLabel, type ScoreKind, type ScoreMix } from "@/domain/score";

export interface ScoreMixEntry {
  kind: ScoreKind;
  /** The kind's share, or with `counted` its count of holes; folded, triples and worse together. */
  value: number;
  /** "40%", or with `counted` "10". */
  figure: string;
  /** "par", or with `counted` "pars". */
  word: string;
  /** The kind's name for a legend key: "Par", or folded "Triple+". */
  label: string;
}

interface ScoreMixEntryOptions {
  /** The mix is hole counts (a round's `scoreCounts`), not shares. */
  counted?: boolean;
  /** Triples and worse read as one kind, "Triple+". */
  fold?: boolean;
}

/** A kind's name; folded, triples stand for worse too: "Triple+". */
const kindLabel = (kind: ScoreKind, fold: boolean) => (fold ? foldedKindLabel(kind) : scoreKindLabel(kind));

/**
 * The kinds a mix has, in score order, each with its figure and word: the one place a mix becomes
 * the segments of the bar and the donut and their legends. Slivers under half a percent would only
 * draw as a seam, so they are skipped.
 */
export function scoreMixEntries(mix: ScoreMix, { counted = false, fold = false }: ScoreMixEntryOptions = {}): ScoreMixEntry[] {
  const kinds = fold ? FOLDED_SCORE_KINDS : SCORE_KEYS;
  return kinds.flatMap((kind) => {
    const value = fold ? foldedCount(mix, kind) : mix[kind];
    if (value <= 0.5) return [];
    const label = kindLabel(kind, fold);
    return [
      counted
        ? { kind, value, label, figure: String(value), word: scoreKindCountLabel(kind, value).toLowerCase() }
        : { kind, value, label, figure: formatPercent(value), word: label.toLowerCase() },
    ];
  });
}

/** The kinds any of several mixes show, in score order, each with its name: the key under a stack of bars. */
export function scoreMixKinds(mixes: readonly ScoreMix[], fold = false): Pick<ScoreMixEntry, "kind" | "label">[] {
  const shown = new Set(mixes.flatMap((mix) => scoreMixEntries(mix, { fold }).map((entry) => entry.kind)));
  return SCORE_KEYS.filter((kind) => shown.has(kind)).map((kind) => ({
    kind,
    label: kindLabel(kind, fold),
  }));
}
