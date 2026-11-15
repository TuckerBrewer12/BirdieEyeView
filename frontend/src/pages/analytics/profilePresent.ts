import {
  COMPARISON_HANDICAPS,
  GOAL_OPTIONS,
  formatCourseName,
  formatOneDecimal,
  formatSigned,
  goalScoreToBreak,
  goalTargetLabel,
  handicapName,
  formatPercent,
  type ComparisonTargetValue,
  type RadarStanding,
} from "@/domain";
import type { FriendOption, GoalStanding, PeakGame, PeakImpact, Saver } from "./profileModel";

export function friendName(friend: FriendOption | null): string {
  return friend?.name ?? "Unknown golfer";
}

export function comparisonKey(value: ComparisonTargetValue, friend: FriendOption | null): string {
  if (value === "friend") return `friend:${friend?.id ?? ""}`;
  return value == null ? "none" : `handicap:${value}`;
}

export function comparisonOptions(friends: readonly FriendOption[]): { value: string; label: string }[] {
  return [
    ...COMPARISON_HANDICAPS.map((handicap) => ({ value: `handicap:${handicap}`, label: handicapName(handicap) })),
    ...friends.map((friend) => ({ value: `friend:${friend.id}`, label: friendName(friend) })),
  ];
}

export function comparisonFromKey(key: string): { value: ComparisonTargetValue; friendId: string | null } | null {
  const [kind, id] = key.split(":");
  if (kind === "friend" && id) return { value: "friend", friendId: id };
  const handicap = COMPARISON_HANDICAPS.find((h) => String(h) === id);
  if (kind === "handicap" && handicap != null) return { value: handicap, friendId: null };
  return null;
}

export function comparisonName(value: ComparisonTargetValue, friend: FriendOption | null): string | null {
  if (value === "friend") return friendName(friend);
  return value == null ? null : handicapName(value);
}

export const GOAL_MENU_OPTIONS = GOAL_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }));

export function goalLabel(target: number | null): string | null {
  return target != null ? goalTargetLabel(target) : null;
}

export const GOAL_COPY = {
  title: "Goal",
  pick: "Pick a goal",
  empty: "Pick a score to break and see how far off it you are.",
} as const;

export function goalProgressLabel(label: string | null): string {
  return `Progress to ${label ?? "the goal"}`;
}

export function goalFigures(goal: GoalStanding): { label: string; value: string; tone: "good" | "bad" | "neutral" }[] {
  const gap = goal.gap;
  return [
    { label: "Average", value: formatOneDecimal(goal.average), tone: "neutral" },
    { label: "Best", value: goal.lowestScore != null ? String(goal.lowestScore) : "—", tone: "good" },
    goal.onTrack
      ? { label: "Under by", value: formatOneDecimal(gap != null ? Math.abs(gap) : null), tone: "good" }
      : { label: "To go", value: formatOneDecimal(gap), tone: gap != null ? "bad" : "neutral" },
  ];
}

export function saversHeading(goal: GoalStanding): string | null {
  if (goal.gap == null || goal.onTrack) return null;
  return `Where to find ${formatOneDecimal(goal.gap)} strokes`;
}

export function saversGoalNote(target: number): string {
  return `to break ${goalScoreToBreak(target)}`;
}

export function saverStrokes(saver: Saver): string {
  return formatSigned(-saver.strokesSaved);
}

export function saverShareLabel(saver: Saver): string {
  return `${saver.headline}: ${formatPercent(saver.shareOfGap)} of the gap`;
}

export const SHAPE_COPY = {
  title: "Player profile",
  compareWith: "Compare with",
  compareWithPrefix: "vs",
  empty: "Play a few more rounds to see your shape.",
  improve: "See how to improve",
} as const;

export function shapeLabel(name: string | null): string {
  return name ? `Your shape against ${name}` : "Your shape";
}

export function standingLines(judged: number, name: string | null): { of: string; ahead: string } {
  return { of: `of ${judged}`, ahead: `areas ahead of ${name ?? "the comparison"}` };
}

export const PEAK_COPY = {
  title: "Peak game",
  columns: ["Per round", "Peak", "Average", "Gained"],
} as const;

export function peakNote(
  peak: PeakGame,
  target: number,
): { lead: string; verdict: string | null; tone: "good" | "bad" | "neutral" } {
  const lead = `best ${peak.rounds.length}`;
  if (peak.meetsGoal == null) return { lead, verdict: null, tone: "neutral" };
  return peak.meetsGoal
    ? { lead: `${lead} · `, verdict: `breaks ${goalScoreToBreak(target)}`, tone: "good" }
    : { lead: `${lead} · `, verdict: `${formatOneDecimal(peak.gapToGoal)} off ${goalScoreToBreak(target)}`, tone: "bad" };
}

export function peakRoundCourse(round: PeakGame["rounds"][number], index: number): string {
  return round.courseName ? formatCourseName(round.courseName) : `Round ${index + 1}`;
}

export const PEAK_IMPACT_LABEL: Record<PeakImpact["kind"], string> = {
  birdies: "Birdies",
  bogeys: "Bogeys",
  doubles: "Doubles or worse",
};

export function peakRow(impact: PeakImpact): { label: string; peak: string; average: string; gained: string } {
  return {
    label: PEAK_IMPACT_LABEL[impact.kind],
    peak: formatOneDecimal(impact.peak),
    average: formatOneDecimal(impact.average),
    gained: formatSigned(impact.strokes),
  };
}

export function friendNote(state: "no-friends" | "loading" | "no-rounds" | "ready", friend: FriendOption | null): string | null {
  if (state === "no-friends") return "Add friends in Social to compare with them.";
  if (state === "loading") return `Loading ${friendName(friend)}'s rounds…`;
  if (state === "no-rounds") return `${friendName(friend)} needs more rounds to compare against.`;
  return null;
}

export function attemptsLabel(count: number, target: number): string {
  return `Last ${count} scores against the ${goalTargetLabel(target).toLowerCase()} goal`;
}

export function standingGroups(
  standing: RadarStanding,
): { title: string; rows: { axis: string; mine: string; against: string }[]; tone: "good" | "bad" }[] {
  return [
    { title: "Ahead", rows: standing.ahead, tone: "good" as const },
    { title: "Behind", rows: standing.behind, tone: "bad" as const },
  ]
    .filter((group) => group.rows.length > 0)
    .map((group) => ({ ...group, rows: group.rows.map(({ axis, mine, theirs }) => ({ axis, mine, against: `vs ${theirs}` })) }));
}
