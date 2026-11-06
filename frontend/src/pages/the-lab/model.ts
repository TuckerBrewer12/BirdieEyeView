import type { Friendship } from "@/data/friendsModel";
import { goalAttemptsFrom, type GoalAttempt, type ParTypeComparison } from "@/domain/benchmark";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { AnalyticsDto, GoalReportDto, GoalSaverDto, PeakImpactDto } from "@/types/api";

/** The Lab weighs a golfer's last 20 rounds at every course, all time: theirs, or a friend's. */
export const LAB_FILTERS: AnalyticsFilters = { limit: 20, timeframe: "all", courseId: "all" };

/** The analytics sections The Lab's figures read, as the server sent them. */
export type LabSections = Pick<AnalyticsDto, "kpis" | "scoring_by_par" | "putts_trend" | "peak_game">;

/**
 * The part of a golfer's last 20 rounds of analytics The Lab reads, picked from the shared
 * analytics query. The rows keep the server's shape: the radar's scale in `domain/radar`
 * reads them as they come.
 */
export type LabAnalytics = LabSections & {
  /** The server's lowest full round in the window, until the goal report has its own. */
  lowestScore: number | null;
};

export function labAnalyticsFrom(dto: AnalyticsDto): LabAnalytics {
  return {
    kpis: dto.kpis,
    scoring_by_par: dto.scoring_by_par,
    putts_trend: dto.putts_trend,
    peak_game: dto.peak_game,
    lowestScore: dto.notable_achievements.scoring_records.lifetime.lowest_round ?? null,
  };
}

/** What the golfer is comparing their shape with: their average alone, their best rounds, a handicap, or a friend. */
export type RadarMode = "benchmark" | "peak";

/** The phone's performance panels, one open at a time. Desktop shows them all. */
export const LAB_PANELS = ["by-par", "putting", "peak"] as const;
export type LabPanel = (typeof LAB_PANELS)[number];

/** The panels with something to show: par types played, putts logged, a peak game. */
export function labPanelsFrom(
  parTypes: readonly ParTypeRow[],
  putting: PuttingSummary | null,
  peak: PeakGame | null,
): LabPanel[] {
  const shown: Record<LabPanel, boolean> = {
    "by-par": parTypes.some((row) => row.averageToPar != null),
    putting: putting != null && (putting.threePuttsPerRound != null || putting.puttsPerRound != null),
    peak: peak != null,
  };
  return LAB_PANELS.filter((panel) => shown[panel]);
}

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
  onTrack: boolean;
  /** The lowest full round in the window, a record: not the round list's best, which goes by to par. */
  lowestScore: number | null;
  /** Rounds in the window at or under the goal. Null before the report loads. */
  roundsMeetingGoal: number | null;
  /** Each scored round in the window, oldest first, marked met or not. Empty before the report loads. */
  attempts: GoalAttempt[];
  /** Biggest saving first, as the server ranked them. */
  savers: Saver[];
}

/** Null until the golfer sets a goal. Before the report loads, the goal stands with no figures. */
export function goalStandingFrom(
  target: number | null | undefined,
  report: GoalReportDto | null | undefined,
): GoalStanding | null {
  if (target == null) return null;
  return {
    target,
    average: report?.scoring_average ?? null,
    gap: report?.gap ?? null,
    progressPct: report?.progress_pct ?? null,
    onTrack: report?.on_track ?? false,
    lowestScore: report?.lowest_score ?? null,
    roundsMeetingGoal: report?.rounds_meeting_goal ?? null,
    attempts: goalAttemptsFrom(report?.attempts ?? []),
    savers: (report?.savers ?? []).map((saver) => ({
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
  overallAverage: number | null;
  /** The goal report's peak average less the goal. Null until it loads. */
  gapToGoal: number | null;
  /** Whether the best rounds' average already meets the goal, as the goal report judged it. Null until it loads. */
  meetsGoal: boolean | null;
}

/** Null until a goal is set and the server has a peak game, which takes two scored rounds. */
export function peakGameFrom(
  analytics: LabSections,
  target: number | null,
  report: GoalReportDto | null | undefined,
): PeakGame | null {
  const peak = analytics.peak_game;
  if (target == null || !peak) return null;
  return {
    rounds: peak.rounds.map((round) => ({ roundId: round.round_id, courseName: round.course_name, score: round.score })),
    average: peak.average,
    overallAverage: analytics.kpis.scoring_average,
    gapToGoal: report?.peak_gap ?? null,
    meetsGoal: report?.peak_meets_goal ?? null,
  };
}

/**
 * One kind of hole, a round, in the peak rounds against all of them, and the strokes a round the
 * difference is worth, as the server worked them out. Doubles counts double bogeys and worse.
 */
export type PeakImpact = PeakImpactDto;

/** One par type's scoring, against the comparison when there is one, as the server judged it. */
export type ParTypeRow = ParTypeComparison;

/** The server's putting figures over the window. Null where no round has the figure. */
export interface PuttingSummary {
  threePuttsPerRound: number | null;
  threePuttRate: number | null;
  puttsPerRound: number | null;
  /** Putts per round, oldest first, for the trend line. */
  puttsTrend: (number | null)[];
}

export function puttingSummaryFrom(analytics: LabSections): PuttingSummary {
  return {
    threePuttsPerRound: analytics.kpis.three_putts_per_round,
    threePuttRate: analytics.kpis.three_putt_rate,
    puttsPerRound: analytics.kpis.average_putts,
    puttsTrend: analytics.putts_trend.slice(-20).map((row) => row.total_putts),
  };
}

/** Each par type's average to par with nothing to compare it with: the golfer's figures alone. */
export function parTypeRowsFrom(analytics: LabSections): ParTypeRow[] {
  return ([3, 4, 5] as const).map((par) => {
    const row = analytics.scoring_by_par.find((r) => r.par === par && r.sample_size > 0);
    return { par, averageToPar: row?.average_to_par ?? null, benchmarkToPar: null, gap: null, verdict: null };
  });
}
