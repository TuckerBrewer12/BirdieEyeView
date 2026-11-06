import type { ToParBar, TrendAreaPoint } from "@/brand";
import {
  formatAverageToPar,
  formatCourseHandicap,
  formatHandicapIndex,
  formatOneDecimal,
  formatPercent,
  pluralize,
  toParLabel,
} from "@/domain";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type {
  GirTrendRowDto,
  NetScoreTrendRowDto,
  PuttsTrendRowDto,
  ScoringByHandicapRowDto,
  ScoringByParRowDto,
  ThreePuttsTrendRowDto,
} from "@/types/api";
import {
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

type InsightRating = Extract<Insight, { rating: unknown }>["rating"];

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

/** An insight as a sentence, with the arrow beside it and whether up is good. */
export interface Narrative {
  text: string;
  trend: Insight["trend"];
  positiveUp: boolean;
}

/** How an insight's arrow reads: moving the good way, the bad way, or holding. */
export type NarrativeTone = "good" | "bad" | "neutral";

export function narrativeTone({ trend, positiveUp }: Narrative): NarrativeTone {
  if (trend === "flat") return "neutral";
  return (trend === "up") === positiveUp ? "good" : "bad";
}

/** More greens is better; fewer strokes and fewer putts are. */
const UP_IS_GOOD: Record<InsightCategory, boolean> = { scoring: false, gir: true, putting: false };

const GIR_VERDICT: Record<InsightRating, string> = {
  strong: "excellent ball striking.",
  fair: "improving this is one of the fastest routes to lower scores.",
  weak: "irons are the area to target for the biggest scoring gains.",
};

const PUTTS_VERDICT: Record<InsightRating, string> = {
  strong: "outstanding on the green.",
  fair: "solid putting.",
  weak: "reducing three-putts is the fastest path to lower scores.",
};

function sentence(insight: Insight): string {
  switch (insight.kind) {
    case "scoring_shift": {
      const strokes = Math.abs(insight.strokes).toFixed(1);
      return insight.strokes > 0
        ? `Your scoring average has improved by ${strokes} strokes over the last ${pluralize(insight.rounds, "round")}.`
        : `Your scoring average has climbed by ${strokes} strokes recently — worth monitoring.`;
    }
    case "best_par":
      return `You score best on par ${insight.par}s — averaging ${formatAverageToPar(insight.average_to_par)} across ${pluralize(insight.holes, "hole")}.`;
    case "gir_average":
      return `Your average GIR% is ${formatPercent(insight.percent, 1)} — ${GIR_VERDICT[insight.rating]}`;
    case "gir_shift": {
      const points = Math.abs(insight.points).toFixed(0);
      return insight.points > 0
        ? `GIR% trending up ${points} points over recent rounds — ball striking improving.`
        : `GIR% has dipped ${points} points recently — iron consistency worth a look.`;
    }
    case "putts_average":
      return `Averaging ${insight.putts.toFixed(1)} putts per round — ${PUTTS_VERDICT[insight.rating]}`;
    case "putts_shift": {
      const putts = Math.abs(insight.putts).toFixed(1);
      return insight.putts > 0
        ? `Putts per round improving — down ${putts} strokes on average.`
        : `Putts per round up ${putts} strokes recently.`;
    }
  }
}

/** An insight in words, with the server's arrow. */
export function narrativeFor(insight: Insight): Narrative {
  return { text: sentence(insight), trend: insight.trend, positiveUp: UP_IS_GOOD[insight.category] };
}

/** The first insight in a category, worded; the phone shows one per section. */
export function leadNarrative(insights: Insight[], category: InsightCategory): Narrative | null {
  const lead = insights.find((insight) => insight.category === category);
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
  return rows.map((row) => roundPoint(row, [row.total_score, row.rolling_average]));
}

export function netScorePoints(rows: NetScoreTrendRowDto[]): TrendAreaPoint[] {
  return rows.map((row) => ({
    ...roundPoint(row, [row.net_score]),
    notes: [
      { label: "Gross", value: row.gross_score != null ? String(row.gross_score) : "—" },
      { label: "To Par", value: toParLabel(row.to_par) ?? "—" },
      { label: "Course HCP", value: formatCourseHandicap(row.course_handicap) },
    ],
  }));
}

export function girPoints(rows: GirTrendRowDto[]): TrendAreaPoint[] {
  return rows.map((row) => ({
    ...roundPoint(row, [row.gir_percentage]),
    notes: [{ label: "Greens", value: `${row.total_gir ?? "—"} of ${row.holes_played}` }],
  }));
}

/** Each round's scrambling rate beside its up-and-down rate. */
export function shortGamePoints(rows: ShortGamePoint[]): TrendAreaPoint[] {
  return rows.map((row) => roundPoint({ round_index: row.roundIndex }, [row.scrambling, row.upAndDown]));
}

export function puttsPoints(rows: PuttsTrendRowDto[]): TrendAreaPoint[] {
  return rows.map((row) => roundPoint(row, [row.total_putts]));
}

export function threePuttPoints(rows: ThreePuttsTrendRowDto[]): TrendAreaPoint[] {
  return rows.map((row) => roundPoint(row, [row.three_putt_count]));
}

export function parBars(rows: ScoringByParRowDto[]): ToParBar[] {
  return rows.map((row) => ({ label: `Par ${row.par}`, toPar: row.average_to_par, detail: pluralize(row.sample_size, "hole") }));
}

export function handicapBars(rows: ScoringByHandicapRowDto[]): ToParBar[] {
  return rows.map((row) => ({
    label: String(row.handicap),
    toPar: row.average_to_par,
    detail: pluralize(row.sample_size, "hole"),
  }));
}

/**
 * The headline figures, worded for their cards: the golfer's own handicap index whatever the
 * filters, and the rest over the filtered rounds.
 */
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
    { label: "Avg Putts", value: formatOneDecimal(kpis.average_putts) },
  ];
}

/** The dashed line across the score trend at the scoring average: "Avg 82.9". */
export function averageReference(average: number | null | undefined): { value: number; label: string } | null {
  return average != null ? { value: average, label: `Avg ${average}` } : null;
}
