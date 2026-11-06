import type { Friendship } from "@/data/friendsModel";
import { goalAttemptsFrom, type GoalAttempt, type ParTypeComparison } from "@/domain/benchmark";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { AnalyticsDto, GoalReportDto, GoalSaverDto, PeakImpactDto } from "@/types/api";

export const LAB_FILTERS: AnalyticsFilters = { limit: 20, timeframe: "all", courseId: "all" };

export type LabSections = Pick<AnalyticsDto, "kpis" | "scoring_by_par" | "putts_trend" | "peak_game">;

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

export type RadarMode = "benchmark" | "peak";

export const LAB_PANELS = ["by-par", "putting", "peak"] as const;
export type LabPanel = (typeof LAB_PANELS)[number];

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
  /** The lowest full round in the window, a record: not the round list's best, which goes by to par. */
  lowestScore: number | null;
  roundsMeetingGoal: number | null;
  attempts: GoalAttempt[];
  savers: Saver[];
}

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
  overallAverage: number | null;
  gapToGoal: number | null;
  meetsGoal: boolean | null;
}

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

export type PeakImpact = PeakImpactDto;

export type ParTypeRow = ParTypeComparison;

export interface PuttingSummary {
  threePuttsPerRound: number | null;
  threePuttRate: number | null;
  puttsPerRound: number | null;
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

export function parTypeRowsFrom(analytics: LabSections): ParTypeRow[] {
  return ([3, 4, 5] as const).map((par) => {
    const row = analytics.scoring_by_par.find((r) => r.par === par && r.sample_size > 0);
    return { par, averageToPar: row?.average_to_par ?? null, benchmarkToPar: null, gap: null, verdict: null };
  });
}
