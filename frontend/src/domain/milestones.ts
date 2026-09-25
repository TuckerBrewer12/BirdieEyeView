import type { NotableAchievements } from "@/types/analytics";

export type MilestoneKind = "under_par" | "score_break" | "putt_break" | "par_streak";

/** A lifetime best as a fact. `value` is the score, the putt threshold, or the streak length. */
export interface MilestoneFact {
  kind: MilestoneKind;
  value: number;
  /** ISO date, "YYYY-MM-DD". */
  date: string;
  course: string;
  roundId: string | null;
}

const isoDate = (raw: string) => raw.split("T")[0];

/**
 * The player's scoring, putting and par-streak bests, newest first. The first
 * round under par stands in for the best score break once there is one.
 */
export function lifetimeMilestones(achievements: NotableAchievements | null | undefined): MilestoneFact[] {
  if (!achievements) return [];
  const rounds = achievements.round_milestones.lifetime;
  const putting = achievements.putting_milestones.lifetime;
  const streak = achievements.best_performance_streaks_events.lifetime.longest_par_streak;

  const underPar = rounds.first_round_under_par;
  const bestBreak = lowestThreshold(rounds.score_breaks);
  const scoring: MilestoneFact | null = underPar
    ? {
        kind: "under_par",
        value: underPar.score,
        date: isoDate(underPar.date),
        course: underPar.course,
        roundId: underPar.round_id ?? null,
      }
    : bestBreak
      ? {
          kind: "score_break",
          value: bestBreak.threshold,
          date: isoDate(bestBreak.achievement.date),
          course: bestBreak.achievement.course,
          roundId: bestBreak.achievement.round_id ?? null,
        }
      : null;

  const puttBreak = lowestThreshold(putting.putt_breaks);
  const puttingBest: MilestoneFact | null = puttBreak
    ? {
        kind: "putt_break",
        value: puttBreak.threshold,
        date: isoDate(puttBreak.achievement.date),
        course: puttBreak.achievement.course,
        roundId: puttBreak.achievement.round_id ?? null,
      }
    : null;

  const parStreak: MilestoneFact | null = streak
    ? {
        kind: "par_streak",
        value: achievements.best_performance_streaks.lifetime.longest_par_streak,
        date: isoDate(streak.date),
        course: streak.course,
        roundId: streak.round_id ?? null,
      }
    : null;

  return [scoring, puttingBest, parStreak]
    .filter((m): m is MilestoneFact => m !== null)
    .sort((left, right) => right.date.localeCompare(left.date));
}

type ThresholdRow = { threshold: number; achievement: { date: string; course: string; round_id?: string | null } | null };

function lowestThreshold<T extends ThresholdRow>(rows: T[]) {
  return rows
    .filter((r): r is T & { achievement: NonNullable<T["achievement"]> } => r.achievement != null)
    .reduce<(T & { achievement: NonNullable<T["achievement"]> }) | null>(
      (best, r) => (!best || r.threshold < best.threshold ? r : best),
      null,
    );
}
