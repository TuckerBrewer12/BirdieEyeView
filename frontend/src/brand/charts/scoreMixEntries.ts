import { SCORE_KEYS, scoreKindLabel } from "@/brand/theme";
import { formatPercent } from "@/domain/format";
import { FOLDED_SCORE_KINDS, foldedCount, foldedKindLabel, scoreKindCountLabel, type ScoreKind, type ScoreMix } from "@/domain/score";

export interface ScoreMixEntry {
  kind: ScoreKind;
  value: number;
  figure: string;
  word: string;
  label: string;
}

interface ScoreMixEntryOptions {
  counted?: boolean;
  fold?: boolean;
}

const kindLabel = (kind: ScoreKind, fold: boolean) => (fold ? foldedKindLabel(kind) : scoreKindLabel(kind));

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

export function scoreMixKinds(mixes: readonly ScoreMix[], fold = false): Pick<ScoreMixEntry, "kind" | "label">[] {
  const shown = new Set(mixes.flatMap((mix) => scoreMixEntries(mix, { fold }).map((entry) => entry.kind)));
  return SCORE_KEYS.filter((kind) => shown.has(kind)).map((kind) => ({
    kind,
    label: kindLabel(kind, fold),
  }));
}
