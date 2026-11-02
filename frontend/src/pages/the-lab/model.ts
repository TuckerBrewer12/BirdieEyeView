import type { Friendship } from "@/data/friendsModel";
import type { BenchmarkProfile } from "@/domain/benchmark";
import { profileAverageToPar } from "@/domain/radar";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { AnalyticsDto, GoalReportDto, GoalSaverDto } from "@/types/api";

/** The Lab weighs a golfer's last 20 rounds at every course, all time: theirs, or a friend's. */
export const LAB_FILTERS: AnalyticsFilters = { limit: 20, timeframe: "all", courseId: "all" };

/**
 * The part of a golfer's last 20 rounds of analytics The Lab reads, picked from the shared
 * analytics query. The rows keep the server's shape: the radar's scale in `domain/radar`
 * reads them as they come.
 */
export type LabAnalytics = Pick<
  AnalyticsDto,
  "kpis" | "scoring_by_par" | "score_trend" | "score_type_distribution" | "three_putts_trend" | "putts_trend"
>;

export function labAnalyticsFrom(dto: AnalyticsDto): LabAnalytics {
  return {
    kpis: dto.kpis,
    scoring_by_par: dto.scoring_by_par,
    score_trend: dto.score_trend,
    score_type_distribution: dto.score_type_distribution,
    three_putts_trend: dto.three_putts_trend,
    putts_trend: dto.putts_trend,
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
  bestScore: number | null;
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
    bestScore: report?.best_score ?? null,
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

// Everything below is golf the server does not send yet, worked out here from the analytics
// rows as the old Lab did. Each is a follow-up to move onto the analytics response.

/** Scores of the scored rounds, oldest first. */
export function scoresOf(analytics: LabAnalytics): number[] {
  return analytics.score_trend
    .map((row) => row.total_score)
    .filter((score): score is number => score != null);
}

/** The lowest score in the window: the goal report's best, until a goal is set. */
export function lowestScore(analytics: LabAnalytics): number | null {
  const scores = scoresOf(analytics);
  return scores.length ? Math.min(...scores) : null;
}

/** How many rounds in the window met the goal. */
export function roundsMeetingGoal(analytics: LabAnalytics, target: number): number {
  return scoresOf(analytics).filter((score) => score <= target).length;
}

/**
 * The last five rounds' average against the whole window's, to a tenth: negative when the
 * golfer has been scoring lower lately. Null under five rounds.
 */
export function recentTrendFrom(analytics: LabAnalytics): number | null {
  const scores = scoresOf(analytics);
  const average = analytics.kpis.scoring_average;
  if (scores.length < 5 || average == null) return null;
  const recent = scores.slice(-5).reduce((sum, score) => sum + score, 0) / 5;
  return Math.round((recent - average) * 10) / 10;
}

export interface PeakRound {
  roundId: string | null;
  courseName: string | null;
  score: number;
}

/** The golfer's best three rounds, and how far their average is from the goal. */
export interface PeakGame {
  rounds: PeakRound[];
  average: number;
  overallAverage: number | null;
  /** Peak average minus goal: zero or less when the best rounds already meet it. */
  gapToGoal: number;
}

/** Null until a goal is set and two rounds are scored. */
export function peakGameFrom(analytics: LabAnalytics, target: number | null): PeakGame | null {
  if (target == null) return null;
  const scored = analytics.score_trend
    .filter((row) => row.total_score != null)
    .map((row) => ({ roundId: row.round_id, courseName: row.course_name, score: row.total_score! }))
    .sort((a, b) => a.score - b.score);
  if (scored.length < 2) return null;
  const rounds = scored.slice(0, 3);
  const average = rounds.reduce((sum, round) => sum + round.score, 0) / rounds.length;
  return {
    rounds,
    average,
    overallAverage: analytics.kpis.scoring_average,
    gapToGoal: average - target,
  };
}

/** Holes of each kind a round, on average. Doubles counts double bogeys and worse. */
export interface PerRoundCounts {
  birdies: number;
  bogeys: number;
  doubles: number;
}

export interface PeakVsAverage {
  peak: PerRoundCounts;
  average: PerRoundCounts;
}

type ScoreTypeRow = LabAnalytics["score_type_distribution"][number];

function perRoundCounts(rows: ScoreTypeRow[]): PerRoundCounts {
  // Each row holds a round's percentages; times its holes, that is a count of holes.
  const holes = (row: ScoreTypeRow, percent: number) => (percent / 100) * row.holes_counted;
  const mean = (count: (row: ScoreTypeRow) => number) =>
    rows.reduce((sum, row) => sum + count(row), 0) / rows.length;
  return {
    birdies: mean((row) => holes(row, row.birdie)),
    bogeys: mean((row) => holes(row, row.bogey)),
    doubles: mean((row) => holes(row, row.double_bogey + row.triple_bogey + row.quad_bogey)),
  };
}

/** Birdies, bogeys and doubles a round in the peak rounds against every round. */
export function peakVsAverageFrom(analytics: LabAnalytics, peak: PeakGame | null): PeakVsAverage | null {
  const all = analytics.score_type_distribution;
  if (!peak || all.length === 0) return null;
  const peakIds = new Set(peak.rounds.map((round) => round.roundId).filter(Boolean));
  const peakRows = all.filter((row) => row.round_id != null && peakIds.has(row.round_id));
  if (peakRows.length === 0) return null;
  return { peak: perRoundCounts(peakRows), average: perRoundCounts(all) };
}

/** One kind of hole, a round, in the peak rounds against all of them, and what the difference is worth. */
export interface PeakImpact {
  kind: keyof PerRoundCounts;
  peak: number;
  average: number;
  /** Strokes a round the peak rounds gain on this kind; negative when they lose them. */
  strokes: number;
}

/** A birdie is a stroke gained and a bogey one lost; a double or worse is counted at two. */
const STROKES_PER_HOLE: Record<keyof PerRoundCounts, number> = { birdies: 1, bogeys: -1, doubles: -2 };

export function peakImpactsFrom(comparison: PeakVsAverage): PeakImpact[] {
  return (["birdies", "bogeys", "doubles"] as const).map((kind) => {
    const peak = comparison.peak[kind];
    const average = comparison.average[kind];
    return { kind, peak, average, strokes: (peak - average) * STROKES_PER_HOLE[kind] };
  });
}

/** One par type's scoring against the comparison. */
export interface ParTypeRow {
  par: 3 | 4 | 5;
  /** The server's average to par on these holes. Null with no holes played. */
  averageToPar: number | null;
  /** The comparison's average to par, or null with nothing to compare. */
  benchmarkToPar: number | null;
}

/** Averages for each putting figure over the window. Null where no round has the figure. */
export interface PuttingSummary {
  threePuttsPerRound: number | null;
  threePuttRate: number | null;
  puttsPerRound: number | null;
  /** Putts per round, oldest first, for the trend line. */
  puttsTrend: (number | null)[];
}

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function puttingSummaryFrom(analytics: LabAnalytics): PuttingSummary {
  const putts = analytics.putts_trend.slice(-20).map((row) => row.total_putts);
  return {
    threePuttsPerRound: mean(analytics.three_putts_trend.map((row) => row.three_putt_count)),
    threePuttRate: mean(analytics.three_putts_trend.map((row) => row.three_putt_percentage)),
    puttsPerRound: mean(putts.filter((value): value is number => value != null)),
    puttsTrend: putts,
  };
}

/** Each par type's average to par, against the comparison profile's. */
export function parTypeRowsFrom(analytics: LabAnalytics, benchmark: BenchmarkProfile | null): ParTypeRow[] {
  return ([3, 4, 5] as const).map((par) => {
    const row = analytics.scoring_by_par.find((r) => r.par === par && r.sample_size > 0);
    return {
      par,
      averageToPar: row?.average_to_par ?? null,
      benchmarkToPar: benchmark ? profileAverageToPar(benchmark[`par${par}`]) : null,
    };
  });
}
