import {
  COMPARISON_HANDICAPS,
  GOAL_OPTIONS,
  formatCourseName,
  formatOneDecimal,
  formatSigned,
  goalScoreToBreak,
  goalTargetLabel,
  type ComparisonTargetValue,
  type RadarGap,
  type RadarStanding,
} from "@/domain";
import type { FriendOption, GoalStanding, PeakGame, PeakImpact, RadarMode, Saver } from "./profileModel";

/** A friend's name, or a stand-in when the server has none. */
export function friendName(friend: FriendOption | null): string {
  return friend?.name ?? "Unknown golfer";
}

/** A handicap benchmark by name: "Scratch", "10 handicap". */
export function handicapName(handicap: number): string {
  return handicap === 0 ? "Scratch" : `${handicap} handicap`;
}

/** The menu's key for a comparison: "handicap:10", "friend:<id>". */
export function comparisonKey(value: ComparisonTargetValue, friend: FriendOption | null): string {
  if (value === "friend") return `friend:${friend?.id ?? ""}`;
  return value == null ? "none" : `handicap:${value}`;
}

/** What the golfer can hold their shape up against: each handicap, then each friend. */
export function comparisonOptions(friends: readonly FriendOption[]): { value: string; label: string }[] {
  return [
    ...COMPARISON_HANDICAPS.map((handicap) => ({ value: `handicap:${handicap}`, label: handicapName(handicap) })),
    ...friends.map((friend) => ({ value: `friend:${friend.id}`, label: friendName(friend) })),
  ];
}

/** A menu key back to a comparison, and the friend it names. Null for a key that is not an option. */
export function comparisonFromKey(key: string): { value: ComparisonTargetValue; friendId: string | null } | null {
  const [kind, id] = key.split(":");
  if (kind === "friend" && id) return { value: "friend", friendId: id };
  const handicap = COMPARISON_HANDICAPS.find((h) => String(h) === id);
  if (kind === "handicap" && handicap != null) return { value: handicap, friendId: null };
  return null;
}

/** Who the shape is held up against, by name: "10 handicap", "Avery Lin", "your peak". */
export function comparisonName(mode: RadarMode, value: ComparisonTargetValue, friend: FriendOption | null): string | null {
  if (mode === "peak") return "your peak";
  if (value === "friend") return friendName(friend);
  return value == null ? null : handicapName(value);
}

export const RADAR_MODES: { value: RadarMode; label: string }[] = [
  { value: "benchmark", label: "Average" },
  { value: "peak", label: "Peak" },
];

/** The goal menu's options. */
export const GOAL_MENU_OPTIONS = GOAL_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }));

/** A goal as the golfer picked it: "Break 80". */
export function goalLabel(target: number | null): string | null {
  return target != null ? goalTargetLabel(target) : null;
}

/** The goal card's three figures. `tone` colours the last: still to go, or met. */
export function goalFigures(goal: GoalStanding): { label: string; value: string; tone: "good" | "bad" | null }[] {
  const gap = goal.gap;
  return [
    { label: "Average", value: formatOneDecimal(goal.average), tone: null },
    { label: "Best", value: goal.lowestScore != null ? String(goal.lowestScore) : "—", tone: "good" },
    gap != null && gap <= 0
      ? { label: "Under by", value: formatOneDecimal(Math.abs(gap)), tone: "good" }
      : { label: "To go", value: formatOneDecimal(gap), tone: gap != null ? "bad" : null },
  ];
}

/** "Where to find 3.9 strokes", over the savers. Null once the goal is met. */
export function saversHeading(goal: GoalStanding): string | null {
  if (goal.gap == null || goal.gap <= 0) return null;
  return `Where to find ${formatOneDecimal(goal.gap)} strokes`;
}

/** "to break 80", beside the savers' heading. */
export function saversGoalNote(target: number): string {
  return `to break ${goalScoreToBreak(target)}`;
}

/** A saver's strokes: "−1.6". */
export function saverStrokes(saver: Saver): string {
  return formatSigned(-saver.strokesSaved);
}

/** "4 of 6", over "areas ahead of 10 handicap". */
export function aheadHeadline(ahead: number, judged: number): { count: string; of: string } {
  return { count: String(ahead), of: `of ${judged}` };
}

/** "+19 pts". */
export function gapPoints(gap: RadarGap): string {
  return `${formatSigned(gap.points, 0)} pts`;
}

/** The peak card's headline: "best 3 · breaks 80", or how far off it is. */
export function peakNote(peak: PeakGame, target: number): { lead: string; verdict: string | null; met: boolean } {
  const lead = `best ${peak.rounds.length}`;
  if (peak.meetsGoal == null) return { lead, verdict: null, met: false };
  return peak.meetsGoal
    ? { lead, verdict: `breaks ${goalScoreToBreak(target)}`, met: true }
    : { lead, verdict: `${formatOneDecimal(peak.gapToGoal)} off ${goalScoreToBreak(target)}`, met: false };
}

/** A peak round's course. */
export function peakRoundCourse(round: PeakGame["rounds"][number], index: number): string {
  return round.courseName ? formatCourseName(round.courseName) : `Round ${index + 1}`;
}

export const PEAK_IMPACT_LABEL: Record<PeakImpact["kind"], string> = {
  birdies: "Birdies",
  bogeys: "Bogeys",
  doubles: "Doubles or worse",
};

/** One row of the peak table. */
export function peakRow(impact: PeakImpact): { label: string; peak: string; average: string; gained: string } {
  return {
    label: PEAK_IMPACT_LABEL[impact.kind],
    peak: formatOneDecimal(impact.peak),
    average: formatOneDecimal(impact.average),
    gained: formatSigned(impact.strokes),
  };
}

/** What a friend comparison is waiting on, in words. Null once it's drawn. */
export function friendNote(state: "no-friends" | "loading" | "no-rounds" | "ready", friend: FriendOption | null): string | null {
  if (state === "no-friends") return "Add friends in Social to compare with them.";
  if (state === "loading") return `Loading ${friendName(friend)}'s rounds…`;
  if (state === "no-rounds") return `${friendName(friend)} needs more rounds to compare against.`;
  return null;
}

/** "Last 12 rounds against break 80", for the attempts chart. */
export function attemptsLabel(count: number, target: number): string {
  return `Last ${count} scores against the ${goalTargetLabel(target).toLowerCase()} goal`;
}

/** The axes ahead, then behind, each group with the tone its figures read in. Empty groups are left out. */
export function standingGroups(standing: RadarStanding): { title: string; rows: RadarGap[]; tone: "good" | "bad" }[] {
  return [
    { title: "Ahead", rows: standing.ahead, tone: "good" as const },
    { title: "Behind", rows: standing.behind, tone: "bad" as const },
  ].filter((group) => group.rows.length > 0);
}
