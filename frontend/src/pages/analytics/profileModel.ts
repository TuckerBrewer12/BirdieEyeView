import type { Friendship } from "@/data/friendsModel";
import { goalAttemptsFrom, type GoalAttempt } from "@/domain/benchmark";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { AnalyticsDto, GoalReportDto, GoalSaverDto, PeakImpactDto } from "@/types/api";

/** The profile weighs a golfer's last 20 rounds at every course, all time, whatever the page's filters: theirs, or a friend's. */
export const PROFILE_FILTERS: AnalyticsFilters = { limit: 20, timeframe: "all", courseId: "all" };

/**
 * The part of a golfer's last 20 rounds of analytics the profile reads, picked from the shared
 * analytics query. The rows keep the server's shape: the radar's scale in `domain/radar` reads
 * them as they come.
 */
export type ProfileAnalytics = Pick<AnalyticsDto, "kpis" | "scoring_by_par" | "peak_game" | "next_level_handicap"> & {
  /** The server's lowest full round in the window, until the goal report has its own. */
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

/** Whose shape the radar draws: the golfer's average, or held up against their peak game. */
export type RadarMode = "benchmark" | "peak";

/** One place to find strokes, in the server's words. */
export interface Saver {
  kind: GoalSaverDto["type"];
  strokesSaved: number;
  /** Percent of the gap to the goal this would close. */
  shareOfGap: number;
  headline: string;
  detail: string;
}

/** Where the golfer stands against their goal, as the server's goal report measured it. */
export interface GoalStanding {
  /** The goal as stored: 79 means breaking 80. */
  target: number;
  average: number | null;
  /** Average minus goal, in strokes a round. Zero or less once the average meets it. */
  gap: number | null;
  progressPct: number | null;
  /** The average meets the goal, as the server judged it. False before the report loads. */
  onTrack: boolean;
  /** The lowest full round in the window, a record: not the round list's best, which goes by to par. */
  lowestScore: number | null;
  /** The last {@link ATTEMPTS_SHOWN} scored rounds, oldest first, marked met or not. Empty before the report loads. */
  attempts: GoalAttempt[];
  /** The {@link SAVERS_SHOWN} biggest savings, biggest first, as the server ranked them. */
  savers: Saver[];
}

/** The scores the goal chart shows: the last twelve. */
export const ATTEMPTS_SHOWN = 12;
/** The places to find strokes the profile shows: the three biggest. */
export const SAVERS_SHOWN = 3;

/**
 * Null until the golfer sets a goal. Before the report loads, the goal stands with no figures but
 * `lowestScore`, the lowest full round the analytics already have, which needs no goal.
 */
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

/** A friend the golfer can compare with. Name is null when the server has none. */
export interface FriendOption {
  id: string;
  name: string | null;
}

/** The golfer's friends, once each, by name. */
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

/** The golfer's best three rounds as the server picked them, and how far their average is from the goal. */
export interface PeakGame {
  rounds: PeakRound[];
  average: number;
  /** The goal report's peak average less the goal. Null until it loads. */
  gapToGoal: number | null;
  /** Whether the best rounds' average already meets the goal, as the goal report judged it. Null until it loads. */
  meetsGoal: boolean | null;
}

/** Null until a goal is set and the server has a peak game, which takes two scored rounds. */
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

/**
 * One kind of hole, a round, in the peak rounds against all of them, and the strokes a round the
 * difference is worth, as the server worked them out. Doubles counts double bogeys and worse.
 */
export type PeakImpact = PeakImpactDto;

