import { toParTextClass } from "@/brand";
import {
  formatAverageToPar,
  goalScoreToBreak,
  goalTargetLabel,
  pluralize,
  type BenchmarkHandicap,
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

/** A handicap's benchmark by the score its golfers break: "Scratch", "Breaks 80". */
function handicapLabel({ handicap, goal }: BenchmarkHandicap): string {
  return handicap === 0 ? "Scratch" : `Breaks ${goalScoreToBreak(goal)}`;
}

function handicapHeading({ handicap, goal }: BenchmarkHandicap): string {
  return handicap === 0 ? "You vs. Scratch" : `You vs. Break-${goalScoreToBreak(goal)} Shape`;
}

function comparedHandicap(
  comparison: ComparisonTargetValue,
  handicaps: readonly BenchmarkHandicap[],
): BenchmarkHandicap | null {
  return handicaps.find((option) => option.handicap === comparison) ?? null;
}

export interface ComparisonOption {
  key: string;
  value: ComparisonTargetValue;
  label: string;
}

/**
 * The comparisons on offer, keyed for a toggle group (whose values are strings):
 * none, each handicap the server has a benchmark for, then a friend.
 */
export function comparisonOptions(handicaps: readonly BenchmarkHandicap[]): ComparisonOption[] {
  return [
    { key: "none", value: null, label: "Just me" },
    ...handicaps.map((option) => ({
      key: String(option.handicap),
      value: option.handicap,
      label: handicapLabel(option),
    })),
    { key: "friend", value: "friend", label: "A friend" },
  ];
}

export function comparisonKey(value: ComparisonTargetValue): string {
  if (value == null) return "none";
  return String(value);
}

/** Null for a key that is not an option, as when the pressed toggle is pressed again. */
export function comparisonFromKey(
  key: string | undefined,
  options: readonly ComparisonOption[],
): { value: ComparisonTargetValue } | null {
  const option = options.find((o) => o.key === key);
  return option ? { value: option.value } : null;
}

/** What the grey shape behind the golfer's is: "Breaks 80", "Avery Lin", "Your peak game". */
export function benchmarkName(
  mode: RadarMode,
  comparison: ComparisonTargetValue,
  friend: FriendOption | null,
  handicaps: readonly BenchmarkHandicap[],
): string | null {
  if (mode === "peak") return "Your peak game";
  if (comparison === "friend") return friendName(friend);
  const handicap = comparedHandicap(comparison, handicaps);
  return handicap ? handicapLabel(handicap) : null;
}

/** The radar card's heading: who the golfer is up against. */
export function benchmarkHeading(
  mode: RadarMode,
  comparison: ComparisonTargetValue,
  friend: FriendOption | null,
  peak: PeakGame | null,
  handicaps: readonly BenchmarkHandicap[],
): string {
  if (mode === "peak") {
    return peak ? `You vs. Your Peak Game (avg ${peak.average.toFixed(1)})` : "Peak Game";
  }
  if (comparison === "friend") return friend ? `You vs. ${friendName(friend)}` : "You vs. Friend";
  const handicap = comparedHandicap(comparison, handicaps);
  return handicap ? handicapHeading(handicap) : "Your Performance Shape";
}

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
