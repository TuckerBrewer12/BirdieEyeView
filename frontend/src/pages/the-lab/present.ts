import { toParTextClass } from "@/brand";
import {
  COMPARISON_HANDICAPS,
  formatAverageToPar,
  goalScoreToBreak,
  goalTargetLabel,
  pluralize,
  type ComparisonTargetValue,
} from "@/domain";
import type {
  FriendOption,
  GoalStanding,
  LabPanel,
  ParTypeRow,
  PeakGame,
  PeakImpact,
  RadarMode,
  Saver,
} from "./model";

/** A friend's name, or a stand-in when the server has none. */
export function friendName(friend: FriendOption | null): string {
  return friend?.name ?? "Unknown golfer";
}

const HANDICAP_LABEL: Record<(typeof COMPARISON_HANDICAPS)[number], string> = {
  0: "Scratch",
  5: "Breaks 80",
  10: "Breaks 85",
  15: "Breaks 90",
  20: "Breaks 95",
  25: "Breaks 100",
};

/**
 * The comparisons on offer, keyed for a toggle group (whose values are strings):
 * none, each handicap benchmark, then a friend.
 */
export const COMPARISON_OPTIONS: { key: string; value: ComparisonTargetValue; label: string }[] = [
  { key: "none", value: null, label: "Just me" },
  ...COMPARISON_HANDICAPS.map((handicap) => ({
    key: String(handicap),
    value: handicap,
    label: HANDICAP_LABEL[handicap],
  })),
  { key: "friend", value: "friend", label: "A friend" },
];

export function comparisonKey(value: ComparisonTargetValue): string {
  return COMPARISON_OPTIONS.find((option) => option.value === value)?.key ?? "none";
}

/** Null for a key that is not an option, as when the pressed toggle is pressed again. */
export function comparisonFromKey(key: string | undefined): { value: ComparisonTargetValue } | null {
  const option = COMPARISON_OPTIONS.find((o) => o.key === key);
  return option ? { value: option.value } : null;
}

/** What the grey shape behind the golfer's is: "Breaks 80", "Avery Lin", "Your peak game". */
export function benchmarkName(
  mode: RadarMode,
  comparison: ComparisonTargetValue,
  friend: FriendOption | null,
): string | null {
  if (mode === "peak") return "Your peak game";
  if (comparison === "friend") return friendName(friend);
  if (comparison == null) return null;
  return HANDICAP_LABEL[comparison as keyof typeof HANDICAP_LABEL] ?? null;
}

/** The radar card's heading: who the golfer is up against. */
export function benchmarkHeading(
  mode: RadarMode,
  comparison: ComparisonTargetValue,
  friend: FriendOption | null,
  peak: PeakGame | null,
): string {
  if (mode === "peak") {
    return peak ? `You vs. Your Peak Game (avg ${peak.average.toFixed(1)})` : "Peak Game";
  }
  if (comparison === "friend") return friend ? `You vs. ${friendName(friend)}` : "You vs. Friend";
  if (comparison == null) return "Your Performance Shape";
  return HANDICAP_HEADING[comparison as keyof typeof HANDICAP_HEADING] ?? "Your Performance Shape";
}

const HANDICAP_HEADING: Record<(typeof COMPARISON_HANDICAPS)[number], string> = {
  0: "You vs. Scratch",
  5: "You vs. Break-80 Shape",
  10: "You vs. Break-85 Shape",
  15: "You vs. Break-90 Shape",
  20: "You vs. Break-95 Shape",
  25: "You vs. Break-100 Shape",
};

/** A goal as the golfer picked it: "Break 80". */
export function goalLabel(target: number | null): string | null {
  return target != null ? goalTargetLabel(target) : null;
}

/** A line under the goal's figures: met, or how far there is to go. */
export function goalStandingNote(goal: GoalStanding): string | null {
  if (goal.onTrack) return `Your average already breaks ${goalScoreToBreak(goal.target)}. Keep it there.`;
  if (goal.gap == null) return null;
  return `${goal.gap.toFixed(1)} strokes a round to go.`;
}

/** How the best rounds stand against the goal: "Your best rounds already break 80." Null until the gap loads. */
export function peakGapNote(peak: PeakGame, goalLabel: string): string | null {
  if (peak.gapToGoal == null || peak.meetsGoal == null) return null;
  if (peak.meetsGoal) return `Your best rounds already ${goalLabel.toLowerCase()}. Make it your new normal.`;
  return `${peak.gapToGoal.toFixed(1)} strokes from ${goalLabel.toLowerCase()} on your best days.`;
}

/** The phone's panel tabs. */
export const LAB_PANEL_LABEL: Record<LabPanel, string> = {
  "by-par": "By Par",
  putting: "Putting",
  peak: "Peak",
};

export const PEAK_IMPACT_LABEL: Record<PeakImpact["kind"], string> = {
  birdies: "Birdies",
  bogeys: "Bogeys",
  doubles: "Doubles+",
};

/** The last five rounds against the 20-round average, in words. */
export function recentTrendNote(trend: number): string {
  if (trend === 0) return "Scoring right at your 20-round average lately.";
  const way = trend > 0 ? "above" : "below";
  return `Trending ${Math.abs(trend).toFixed(1)} strokes ${way} your 20-round average.`;
}

/**
 * The line under a par type, and the gap it is coloured with, in the words of the server's
 * verdict. Null without a comparison.
 */
export function parTypeGapNote(row: ParTypeRow, benchmarkName: string): { text: string; gap: number } | null {
  if (row.benchmarkToPar == null || row.gap == null || row.verdict == null) return null;
  const mark = `${benchmarkName} ${formatAverageToPar(row.benchmarkToPar)}`;
  const detail = {
    ahead: "ahead of it",
    behind: `${row.gap.toFixed(2)} a hole to close`,
    even: "even with it",
  }[row.verdict];
  return { text: `${mark} · ${detail}`, gap: row.gap };
}

/**
 * A count of strokes with its sign, and the tone to paint it.
 * A gain is good, so the tone is to-par of the negation: "+1.2 strokes" reads birdie.
 */
export function signedStrokes(strokes: number): { text: string; tone: string } {
  const rounded = Math.round(strokes * 10) / 10;
  return {
    text: `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)} strokes`,
    tone: toParTextClass(-strokes),
  };
}

/** What each kind of saver is about, in a couple of words. The server words the rest. */
export const SAVER_LABEL: Record<Saver["kind"], string> = {
  three_putt_bleed: "3-Putts",
  blowup_holes: "Blow-ups",
  achilles_heel: "Trouble Distance",
  home_course_demon: "Home Course",
  gir_opportunity: "Greens in Reg.",
  scrambling_opportunity: "Scrambling",
  par5_opportunity: "Par 5s",
};

/** How many times the goal was met, in words: "keep going", "once!", "3 rounds". */
export function timesMetLabel(count: number): string {
  if (count === 0) return "keep going";
  if (count === 1) return "once!";
  return pluralize(count, "round");
}
