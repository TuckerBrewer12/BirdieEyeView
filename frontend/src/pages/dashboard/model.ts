import { SCORE_KEYS, type ScoreKey } from "@/brand/theme";
import { whsWindow } from "@/domain/handicap";
import { roundScore, type Round } from "@/domain/round";
import type { Milestone } from "@/types/golf";
import type { AnalyticsData, GoalReport, ScoreTypeRow } from "@/types/analytics";

export type TrendView = "score" | "hcp";
export type HiTrend = "up" | "down" | "flat";

/** Analytics payload names → brand `ScoreKey`. */
const ANALYTICS_TO_BRAND = {
  eagle: "eagle",
  birdie: "birdie",
  par: "par",
  bogey: "bogey",
  double_bogey: "double",
  triple_bogey: "triple",
  quad_bogey: "quad",
} as const satisfies Record<string, ScoreKey>;

type AnalyticsScoreField = keyof typeof ANALYTICS_TO_BRAND;

const ANALYTICS_SCORE_FIELDS = Object.keys(ANALYTICS_TO_BRAND) as AnalyticsScoreField[];

export function pickBestRound(rounds: Round[]): Round | null {
  const scored = rounds.filter((r) => roundScore(r) != null);
  if (!scored.length) return null;
  return scored.reduce((best, curr) => (roundScore(curr)! < roundScore(best)! ? curr : best));
}

export interface DualTrendPoint {
  round_index: number;
  total_score: number | null;
  to_par: number | null;
  handicap_index: number | null;
  course_name?: string | null;
  used_in_hi?: boolean | null;
  differential?: number | null;
  hi_threshold?: number | null;
}

export function dualTrendFrom(trends: AnalyticsData | null): DualTrendPoint[] {
  if (!trends) return [];
  return trends.score_trend.map((row, i) => ({
    ...row,
    handicap_index: trends.handicap_trend[i]?.handicap_index ?? null,
    used_in_hi: trends.handicap_trend[i]?.used_in_hi ?? null,
    differential: trends.handicap_trend[i]?.differential ?? null,
    hi_threshold: trends.handicap_trend[i]?.hi_threshold ?? null,
  }));
}

export interface ScoreMixItem {
  name: ScoreKey;
  value: number;
}

export function mixFromRows(
  rows: ScoreTypeRow[],
  opts: { roundTenths?: boolean; dropZero?: boolean } = {},
): ScoreMixItem[] {
  if (!rows.length) return [];
  let total = 0;
  const sums: Record<ScoreKey, number> = {
    eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0,
  };
  for (const row of rows) {
    total += row.holes_counted;
    for (const field of ANALYTICS_SCORE_FIELDS) {
      sums[ANALYTICS_TO_BRAND[field]] += (row[field] / 100) * row.holes_counted;
    }
  }
  const items = SCORE_KEYS.map((key) => {
    const raw = total > 0 ? (sums[key] / total) * 100 : 0;
    return {
      name: key,
      value: opts.roundTenths ? Math.round(raw * 10) / 10 : raw,
    };
  });
  return opts.dropZero ? items.filter((d) => d.value > 0) : items;
}

export function last20ScoringAvg(trends: AnalyticsData | null): number | null {
  const valid = (trends?.score_trend ?? []).filter((r) => r.total_score != null);
  if (!valid.length) return null;
  return valid.reduce((s, r) => s + r.total_score!, 0) / valid.length;
}

export function last5ScoringAvg(trends: AnalyticsData | null): number | null {
  const valid = (trends?.score_trend ?? []).filter((r) => r.total_score != null);
  if (valid.length < 2) return null;
  const slice = valid.slice(-5);
  return slice.reduce((s, r) => s + r.total_score!, 0) / slice.length;
}

export function handicapDelta(trends: AnalyticsData | null): number | null {
  const valid = (trends?.handicap_trend ?? []).filter((r) => r.handicap_index != null);
  if (valid.length < 2) return null;
  const recent = valid[valid.length - 1].handicap_index!;
  const prev = valid[Math.max(0, valid.length - 6)].handicap_index!;
  return +(recent - prev).toFixed(1);
}

export function hiTrend(trends: AnalyticsData | null): HiTrend | null {
  if (!trends) return null;
  const valid = trends.handicap_trend.filter((r) => r.handicap_index != null);
  if (valid.length < 3) return null;
  const diff = valid[0].handicap_index! - valid[valid.length - 1].handicap_index!;
  if (Math.abs(diff) < 0.3) return "flat";
  return diff > 0 ? "down" : "up";
}

export function girPct(trends: AnalyticsData | null): number {
  const rows = (trends?.gir_trend ?? [])
    .slice(-5)
    .filter((r) => r.total_gir != null && r.holes_played > 0);
  if (!rows.length) return Math.max(0, Math.min(100, trends?.kpis.gir_percentage ?? 0));
  const totalGir = rows.reduce((s, r) => s + (r.total_gir ?? 0), 0);
  const totalHoles = rows.reduce((s, r) => s + r.holes_played, 0);
  return Math.max(0, Math.min(100, (totalGir / totalHoles) * 100));
}

export function scramblingPct(trends: AnalyticsData | null): number | null {
  const rows = (trends?.scrambling_trend ?? []).slice(-5);
  const opps = rows.reduce((s, r) => s + r.scramble_opportunities, 0);
  const succ = rows.reduce((s, r) => s + r.scramble_successes, 0);
  return opps > 0 ? (succ / opps) * 100 : null;
}

export function upAndDownPct(trends: AnalyticsData | null): number | null {
  const rows = (trends?.up_and_down_trend ?? []).slice(-5);
  const opps = rows.reduce((s, r) => s + r.opportunities, 0);
  const succ = rows.reduce((s, r) => s + r.successes, 0);
  return opps > 0 ? (succ / opps) * 100 : null;
}

export function puttsAvg(trends: AnalyticsData | null, fallback: number | null | undefined): number {
  const rows = (trends?.putts_trend ?? [])
    .slice(-5)
    .filter((r) => r.total_putts != null && r.holes_played > 0);
  if (!rows.length) return fallback ?? 36;
  const totalPutts = rows.reduce((s, r) => s + (r.total_putts ?? 0), 0);
  const totalHoles = rows.reduce((s, r) => s + r.holes_played, 0);
  return totalHoles > 0 ? (totalPutts / totalHoles) * 18 : (fallback ?? 36);
}

export function mixHoleCount(trends: AnalyticsData | null): number {
  return (trends?.score_type_distribution ?? []).reduce((s, r) => s + r.holes_counted, 0);
}

export function milestonesFrom(trends: AnalyticsData | null): Milestone[] {
  if (!trends) return [];
  const a = trends.notable_achievements;
  const normalizeDate = (raw: string) => raw.split("T")[0].replace(/-/g, "/");

  const scoreBest = a.round_milestones.lifetime.first_round_under_par
    ? {
        type: "score_break" as const,
        label: `First round under par (${a.round_milestones.lifetime.first_round_under_par.score})`,
        date: normalizeDate(a.round_milestones.lifetime.first_round_under_par.date),
        course: a.round_milestones.lifetime.first_round_under_par.course,
      }
    : (() => {
        const best = a.round_milestones.lifetime.score_breaks
          .filter((r) => r.achievement != null)
          .reduce<typeof a.round_milestones.lifetime.score_breaks[number] | null>(
            (c, r) => (!c || r.threshold < c.threshold ? r : c),
            null,
          );
        return best?.achievement
          ? {
              type: "score_break" as const,
              label: `Best score: ${best.threshold} or better`,
              date: normalizeDate(best.achievement.date),
              course: best.achievement.course,
            }
          : null;
      })();

  const puttingBest = (() => {
    const best = a.putting_milestones.lifetime.putt_breaks
      .filter((r) => r.achievement != null)
      .reduce<typeof a.putting_milestones.lifetime.putt_breaks[number] | null>(
        (c, r) => (!c || r.threshold < c.threshold ? r : c),
        null,
      );
    return best?.achievement
      ? {
          type: "putt_break" as const,
          label: `Fewest putts: ${best.threshold}`,
          date: normalizeDate(best.achievement.date),
          course: best.achievement.course,
        }
      : null;
  })();

  const parStreakEvent = a.best_performance_streaks_events.lifetime.longest_par_streak;
  const parStreak = parStreakEvent
    ? {
        type: "par_streak" as const,
        label: `Par streak: ${a.best_performance_streaks.lifetime.longest_par_streak} in a row`,
        date: normalizeDate(parStreakEvent.date),
        course: parStreakEvent.course,
      }
    : null;

  return ([scoreBest, puttingBest, parStreak] as Array<Milestone | null>)
    .filter((m): m is Milestone => m !== null)
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 3);
}

export function goalBarPct(goalReport: GoalReport | null): number {
  if (!goalReport) return 0;
  if (goalReport.on_track) return 100;
  if (goalReport.gap == null) return 5;
  return Math.min(
    100,
    Math.max(5, (1 - goalReport.gap / Math.max(goalReport.scoring_average ?? 1, 1)) * 100),
  );
}

export function goalProgressPct(
  scoringGoal: number | null | undefined,
  goalReport: GoalReport | null,
  last20Avg: number | null,
  dualData: DualTrendPoint[],
): number | null {
  if (!scoringGoal) return null;
  const current = goalReport?.scoring_average ?? last20Avg;
  if (current == null) return null;
  if (goalReport?.on_track) return 100;
  const validScores = dualData.filter((d) => d.total_score != null);
  if (!validScores.length) return null;
  const startAvg = validScores[0].total_score!;
  const range = startAvg - scoringGoal;
  if (range <= 0) return 100;
  return Math.min(100, Math.max(0, ((startAvg - current) / range) * 100));
}

export interface WhsRound {
  roundIndex: number;
  courseName: string | null;
  courseRating: number | null;
  slopeRating: number | null;
  score: number | null;
  differential: number | null;
  used: boolean;
}

export interface WhsBreakdown {
  rows: WhsRound[];
  windowSize: number;
  countUsed: number;
  adjustment: number;
  diffAvg: number | null;
  hasRatedRounds: boolean;
  showCalculation: boolean;
}

export function whsBreakdown(
  dualData: DualTrendPoint[],
  trends: AnalyticsData | null,
  handicapIndex: number | null | undefined,
): WhsBreakdown {
  const rowsSource = dualData.slice().reverse();
  const rows: WhsRound[] = rowsSource.map((d) => {
    const diff = trends?.score_differentials.find((s) => s.round_index === d.round_index);
    const trend = trends?.score_trend.find((s) => s.round_index === d.round_index);
    return {
      roundIndex: d.round_index,
      courseName: trend?.course_name ?? null,
      courseRating: diff?.course_rating ?? null,
      slopeRating: diff?.slope_rating ?? null,
      score: diff?.score ?? d.total_score ?? null,
      differential: d.differential ?? null,
      used: d.used_in_hi === true,
    };
  });
  const validCount = rows.filter((r) => r.differential != null).length;
  const n = Math.min(validCount, 20);
  const { countUsed, adjustment } = whsWindow(n);
  const usedDiffs = rowsSource
    .filter((r) => r.used_in_hi === true && r.differential != null)
    .map((r) => r.differential!);
  const diffAvg = usedDiffs.length
    ? usedDiffs.reduce((a, b) => a + b, 0) / usedDiffs.length
    : null;
  const hasRatedRounds = (trends?.score_differentials ?? []).some((r) => r.course_rating != null);
  return {
    rows,
    windowSize: n,
    countUsed,
    adjustment,
    diffAvg,
    hasRatedRounds,
    showCalculation: handicapIndex != null && n >= 3,
  };
}
