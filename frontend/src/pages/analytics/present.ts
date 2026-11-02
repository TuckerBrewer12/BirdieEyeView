import type { ToParBar, TrendAreaPoint } from "@/brand";
import { formatCourseHandicap, formatHandicapIndex, toParLabel } from "@/domain";
import type {
  AnalyticsFilters,
  GIRTrendRow,
  NetScoreTrendRow,
  PuttsTrendRow,
  ScoringByHandicapRow,
  ScoringByParRow,
  ThreePuttRow,
} from "@/types/analytics";
import {
  insightCategory,
  ANALYTICS_TABS,
  type Analytics,
  type AnalyticsTab,
  type GirSplit,
  type Insight,
  type InsightCategory,
  type PlayedCourse,
  type ScoreTrendPoint,
  type ShortGamePoint,
} from "./model";

const TAB_LABELS: Record<AnalyticsTab, string> = {
  scoring: "Scoring",
  "ball-striking": "Ball Striking",
  putting: "Putting",
  profile: "Profile",
  range: "Range View",
};

/** The phone's section tabs, in order. */
export const ANALYTICS_TAB_OPTIONS: readonly { value: AnalyticsTab; label: string }[] = ANALYTICS_TABS.map((tab) => ({
  value: tab,
  label: TAB_LABELS[tab],
}));

export const RANGE_VIEW_EMPTY = "Play more rounds to unlock Range View data.";

export function emptyMessage(filtered: boolean): string {
  return filtered ? "No rounds found for the selected filters." : "Play some rounds to see your analytics.";
}

export function averagePuttsLabel(putts: number | null): string | null {
  return putts != null ? putts.toFixed(1) : null;
}

/** An insight as a sentence, with the arrow beside it and whether up is good. */
export interface Narrative {
  text: string;
  trend: "up" | "down" | "flat";
  positiveUp: boolean;
}

/** How an insight's arrow reads: moving the good way, the bad way, or holding. */
export type NarrativeTone = "good" | "bad" | "neutral";

export function narrativeTone({ trend, positiveUp }: Narrative): NarrativeTone {
  if (trend === "flat") return "neutral";
  return (trend === "up") === positiveUp ? "good" : "bad";
}

export function narrativeFor(insight: Insight): Narrative {
  switch (insight.kind) {
    case "scoring-shift": {
      const strokes = Math.abs(insight.strokes).toFixed(1);
      return insight.strokes > 0
        ? {
            text: `Your scoring average has improved by ${strokes} strokes over the last ${insight.rounds} rounds.`,
            trend: "down",
            positiveUp: false,
          }
        : {
            text: `Your scoring average has climbed by ${strokes} strokes recently — worth monitoring.`,
            trend: "up",
            positiveUp: false,
          };
    }
    case "best-par":
      return {
        text: `You score best on par ${insight.par}s — averaging ${toParLabel(Number(insight.averageToPar.toFixed(2)))} across ${insight.holes} holes.`,
        trend: insight.averageToPar <= 0 ? "down" : "flat",
        positiveUp: false,
      };
    case "gir-average": {
      const percent = insight.percent.toFixed(1);
      const verdict =
        insight.percent >= 55
          ? "excellent ball striking."
          : insight.percent >= 33
            ? "improving this is one of the fastest routes to lower scores."
            : "irons are the area to target for the biggest scoring gains.";
      return {
        text: `Your average GIR% is ${percent}% — ${verdict}`,
        trend: insight.percent >= 50 ? "up" : "flat",
        positiveUp: true,
      };
    }
    case "gir-shift": {
      const points = Math.abs(insight.points).toFixed(0);
      return insight.points > 0
        ? {
            text: `GIR% trending up ${points} points over recent rounds — ball striking improving.`,
            trend: "up",
            positiveUp: true,
          }
        : {
            text: `GIR% has dipped ${points} points recently — iron consistency worth a look.`,
            trend: "down",
            positiveUp: true,
          };
    }
    case "putts-average": {
      const putts = insight.putts.toFixed(1);
      const verdict =
        insight.putts <= 30
          ? "outstanding on the green."
          : insight.putts <= 34
            ? "solid putting."
            : "reducing three-putts is the fastest path to lower scores.";
      return {
        text: `Averaging ${putts} putts per round — ${verdict}`,
        trend: insight.putts <= 32 ? "down" : insight.putts <= 36 ? "flat" : "up",
        positiveUp: false,
      };
    }
    case "putts-shift": {
      const putts = Math.abs(insight.putts).toFixed(1);
      return insight.putts > 0
        ? { text: `Putts per round improving — down ${putts} strokes on average.`, trend: "down", positiveUp: false }
        : { text: `Putts per round up ${putts} strokes recently.`, trend: "up", positiveUp: false };
    }
  }
}

/** The first insight in a category, worded; the phone shows one per section. */
export function leadNarrative(insights: Insight[], category: InsightCategory): Narrative | null {
  const lead = insights.find((insight) => insightCategory(insight) === category);
  return lead ? narrativeFor(lead) : null;
}

/** Which insights head each phone section; profile and range view have none. */
const TAB_INSIGHTS: Partial<Record<AnalyticsTab, InsightCategory>> = {
  scoring: "scoring",
  "ball-striking": "gir",
  putting: "putting",
};

/** The sentence that heads a phone section, or null if it has none. */
export function tabNarrative(insights: Insight[], tab: AnalyticsTab): Narrative | null {
  const category = TAB_INSIGHTS[tab];
  return category ? leadNarrative(insights, category) : null;
}

/** The round counts the filter offers. "All" asks for as many as the server allows. */
export const LIMIT_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 500, label: "All" },
];

export const TIMEFRAME_OPTIONS: readonly { value: AnalyticsFilters["timeframe"]; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "ytd", label: "YTD" },
  { value: "1y", label: "12 Mo" },
];

/** The course filter's choices: every course, the home course if the golfer has one, then each course played. */
export function courseOptions(
  playedCourses: PlayedCourse[],
  hasHomeCourse: boolean,
): { value: string; label: string }[] {
  return [
    { value: "all", label: "All Courses" },
    ...(hasHomeCourse ? [{ value: "home", label: "Home Course" }] : []),
    ...playedCourses.map((course) => ({ value: course.id, label: course.name ?? "Unnamed Course" })),
  ];
}

export function percentLabel(percent: number | null | undefined): string {
  return percent != null ? `${Math.round(percent)}%` : "—";
}

/** An average to par, as golfers write it, to two places: "+0.85", "E", "-0.1". */
export function averageToParLabel(value: number): string {
  return toParLabel(Math.round(value * 100) / 100) ?? "E";
}

export function holesLabel(holes: number): string {
  return `${holes} ${holes === 1 ? "hole" : "holes"}`;
}

export const GIR_SPLIT_LABEL: Record<GirSplit["bucket"], string> = {
  GIR: "Green hit",
  "No GIR": "Green missed",
};

function roundPoint(
  row: { round_index: number; course_name?: string | null },
  values: (number | null)[],
): TrendAreaPoint {
  return { tick: row.round_index, title: `Round ${row.round_index}`, subtitle: row.course_name ?? null, values };
}

/** Each round's score beside its five-round rolling average. */
export function scoreTrendPoints(rows: ScoreTrendPoint[]): TrendAreaPoint[] {
  return rows.map((row) => roundPoint(row, [row.total_score, row.rolling_avg]));
}

export function netScorePoints(rows: NetScoreTrendRow[]): TrendAreaPoint[] {
  return rows.map((row) => ({
    ...roundPoint(row, [row.net_score]),
    notes: [
      { label: "Gross", value: row.gross_score != null ? String(row.gross_score) : "—" },
      { label: "To Par", value: toParLabel(row.to_par) ?? "—" },
      { label: "Course HCP", value: formatCourseHandicap(row.course_handicap) },
    ],
  }));
}

export function girPoints(rows: GIRTrendRow[]): TrendAreaPoint[] {
  return rows.map((row) => ({
    ...roundPoint(row, [row.gir_percentage]),
    notes: [{ label: "Greens", value: `${row.total_gir ?? "—"} of ${row.holes_played}` }],
  }));
}

/** Each round's scrambling rate beside its up-and-down rate. */
export function shortGamePoints(rows: ShortGamePoint[]): TrendAreaPoint[] {
  return rows.map((row) => roundPoint(row, [row.scrambling_percentage, row.up_and_down_pct]));
}

export function puttsPoints(rows: PuttsTrendRow[]): TrendAreaPoint[] {
  return rows.map((row) => roundPoint(row, [row.total_putts]));
}

export function threePuttPoints(rows: ThreePuttRow[]): TrendAreaPoint[] {
  return rows.map((row) => roundPoint(row, [row.three_putt_count]));
}

export function parBars(rows: ScoringByParRow[]): ToParBar[] {
  return rows.map((row) => ({ label: `Par ${row.par}`, toPar: row.average_to_par, detail: holesLabel(row.sample_size) }));
}

export function handicapBars(rows: ScoringByHandicapRow[]): ToParBar[] {
  return rows.map((row) => ({
    label: String(row.handicap),
    toPar: row.average_to_par,
    detail: holesLabel(row.sample_size),
  }));
}

/** The headline figures over the filtered rounds, worded for their cards. */
export function headlineFigures(analytics: Analytics): { label: string; value: string; detail?: string | null }[] {
  const { kpis } = analytics;
  return [
    { label: "Handicap Index", value: formatHandicapIndex(kpis.handicap_index) },
    { label: "Rounds", value: String(kpis.total_rounds) },
    { label: "Scoring Avg", value: kpis.scoring_average != null ? String(kpis.scoring_average) : "—" },
    {
      label: "Best Round",
      value: analytics.bestScore != null ? String(analytics.bestScore) : "—",
      detail: analytics.bestRound?.course,
    },
    { label: "Avg Putts", value: averagePuttsLabel(analytics.averagePutts) ?? "—" },
  ];
}

/** The dashed line across the score trend at the scoring average: "Avg 82.9". */
export function averageReference(average: number | null | undefined): { value: number; label: string } | null {
  return average != null ? { value: average, label: `Avg ${average}` } : null;
}
