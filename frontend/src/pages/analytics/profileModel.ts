import type { Friendship } from "@/data/friendsModel";
import { goalAttemptsFrom, type GoalAttempt } from "@/domain/benchmark";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { AnalyticsDto, GoalReportDto, GoalSaverDto, PeakImpactDto } from "@/types/api";

export const PROFILE_FILTERS: AnalyticsFilters = { limit: 20, timeframe: "all", courseId: "all" };

export type ProfileAnalytics = Pick<AnalyticsDto, "kpis" | "scoring_by_par" | "peak_game" | "next_level_handicap"> & {
  lowestScore: number | null;
};

export function profileAnalyticsFrom(dto: AnalyticsDto): ProfileAnalytics {
  return {
    kpis: dto.kpis,
    scoring_by_par: dto.scoring_by_par,
    peak_game: dto.peak_game,
    next_level_handicap: dto.next_level_handicap,
    lowestScore: dto.notable_achievements.scoring_records.lifetime.lowest_round ?? null,
  };
}

export interface Saver {
  kind: GoalSaverDto["type"];
  strokesSaved: number;
  shareOfGap: number;
  headline: string;
  detail: string;
}

export interface GoalStanding {
  target: number;
  average: number | null;
  gap: number | null;
  progressPct: number | null;
  onTrack: boolean;
  lowestScore: number | null;
  attempts: GoalAttempt[];
  savers: Saver[];
}

export const ATTEMPTS_SHOWN = 12;
export const SAVERS_SHOWN = 3;

export function goalStandingFrom(
  target: number | null | undefined,
  report: GoalReportDto | null | undefined,
  lowestScore: number | null = null,
): GoalStanding | null {
  if (target == null) return null;
  return {
    target,
    average: report?.scoring_average ?? null,
    gap: report?.gap ?? null,
    progressPct: report?.progress_pct ?? null,
    onTrack: report?.on_track ?? false,
    lowestScore: report?.lowest_score ?? lowestScore,
    attempts: goalAttemptsFrom(report?.attempts ?? []).slice(-ATTEMPTS_SHOWN),
    savers: (report?.savers ?? []).slice(0, SAVERS_SHOWN).map((saver) => ({
      kind: saver.type,
      strokesSaved: saver.strokes_saved,
      shareOfGap: saver.percentage_of_gap,
      headline: saver.headline,
      detail: saver.detail,
    })),
  };
}

export interface FriendOption {
  id: string;
  name: string | null;
}

export function friendOptionsFrom(friendships: readonly Friendship[]): FriendOption[] {
  const byId = new Map<string, FriendOption>();
  for (const friendship of friendships) {
    if (friendship.status !== "accepted" || byId.has(friendship.other.id)) continue;
    byId.set(friendship.other.id, { id: friendship.other.id, name: friendship.other.name });
  }
  return [...byId.values()].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

export interface PeakRound {
  roundId: string | null;
  courseName: string | null;
  score: number;
}

export interface PeakGame {
  rounds: PeakRound[];
  average: number;
  gapToGoal: number | null;
  meetsGoal: boolean | null;
}

export function peakGameFrom(
  analytics: Pick<ProfileAnalytics, "peak_game">,
  target: number | null,
  report: GoalReportDto | null | undefined,
): PeakGame | null {
  const peak = analytics.peak_game;
  if (target == null || !peak) return null;
  return {
    rounds: peak.rounds.map((round) => ({ roundId: round.round_id, courseName: round.course_name, score: round.score })),
    average: peak.average,
    gapToGoal: report?.peak_gap ?? null,
    meetsGoal: report?.peak_meets_goal ?? null,
  };
}

export type PeakImpact = PeakImpactDto;

