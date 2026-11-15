import type { Column, LineOption, ShareSegment, StatDirection, TrendAreaCount, TrendAreaPoint } from "@/brand";
import {
  formatAverageToPar,
  formatOneDecimal,
  formatPercent,
  courseLabel,
  FOLDED_SCORE_KINDS,
  foldedCount,
  foldedKindLabel,
  formatWhole,
  handicapName,
  moveOf,
  pluralize,
  type ParTypeComparison,
  type ScoreMix,
} from "@/domain";
import {
  ANALYTICS_TABS,
  type Analytics,
  type AnalyticsTab,
  type GirSplit,
  type HeadlineFigure,
  type HoleDifficulty,
  type PlayedCourse,
  type PuttsPerHole,
  type RoundSeriesPoint,
  type ScorePoint,
  type TrendLine,
  type ThreePuttRound,
  type YardageBucket,
} from "./model";

const TAB_LABEL: Record<AnalyticsTab, string> = {
  profile: "Profile",
  scoring: "Scoring",
  "ball-striking": "Ball striking",
  putting: "Putting",
  approach: "Approach",
};

export const ANALYTICS_TAB_OPTIONS: readonly { key: AnalyticsTab; label: string }[] = ANALYTICS_TABS.map((tab) => ({
  key: tab,
  label: TAB_LABEL[tab],
}));

export const LIMIT_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "10", label: "Last 10 rounds" },
  { value: "20", label: "Last 20 rounds" },
  { value: "50", label: "Last 50 rounds" },
  { value: "500", label: "All rounds" },
];

export function courseOptions(playedCourses: readonly PlayedCourse[], hasHomeCourse: boolean): { value: string; label: string }[] {
  return [
    { value: "all", label: "All courses" },
    ...(hasHomeCourse ? [{ value: "home", label: "Home course" }] : []),
    ...playedCourses.map((course) => ({ value: course.id, label: courseLabel(course.name) })),
  ];
}

export function roundCountLabel(count: number): string {
  return pluralize(count, "round");
}

export function emptyMessage(filtered: boolean): string {
  return filtered ? "No rounds at this course yet." : "Play some rounds to see your analytics.";
}

export interface HeadlineTile {
  metric: HeadlineFigure["metric"];
  label: string;
  value: string;
  delta: string;
  direction: StatDirection | null;
  tone: "good" | "bad" | "neutral";
  trend: number[];
}

const HEADLINE_LABEL: Record<HeadlineFigure["metric"], string> = {
  scoring_average: "Scoring avg",
  gir_percentage: "Greens hit",
  average_putts: "Putts / round",
  scrambling_percentage: "Scrambling",
  three_putt_rate: "3-putt rate",
};

const PERCENT_METRICS = new Set<HeadlineFigure["metric"]>(["gir_percentage", "scrambling_percentage", "three_putt_rate"]);

export function headlineTiles(figures: readonly HeadlineFigure[]): HeadlineTile[] {
  return figures.map((figure) => {
    const percent = PERCENT_METRICS.has(figure.metric);
    const move = moveOf(figure.change, percent ? formatWhole : formatOneDecimal);
    return {
      metric: figure.metric,
      label: HEADLINE_LABEL[figure.metric],
      value: percent ? formatPercent(figure.value) : formatOneDecimal(figure.value),
      delta: move.amount,
      direction: move.direction,
      tone: figure.verdict ?? "neutral",
      trend: figure.trend,
    };
  });
}

export function onPhone(metric: HeadlineTile["metric"]): boolean {
  return metric !== "scrambling_percentage";
}

export function seriesPoints(series: readonly RoundSeriesPoint[], format: (value: number) => string): TrendAreaPoint[] {
  return series.map((point, i) => ({
    tick: i + 1,
    title: `Round ${i + 1}`,
    subtitle: point.course,
    values: [point.value, point.rollingAverage],
    notes: point.rollingAverage != null ? [{ label: "5-round avg", value: format(point.rollingAverage) }] : undefined,
  }));
}

export function trendLineOptions(points: readonly ScorePoint[]): LineOption<TrendLine>[] {
  const kinds = FOLDED_SCORE_KINDS.filter((kind) => points.some((point) => point.counts && foldedCount(point.counts, kind) > 0));
  return [
    { value: "score", label: "Score", swatch: "primary" },
    ...kinds.map((kind) => ({ value: kind, label: foldedKindLabel(kind, true), swatch: kind })),
  ];
}

export function scoreShown(lines: readonly TrendLine[]): boolean {
  return lines.includes("score");
}

export function countLines(points: readonly ScorePoint[], lines: readonly TrendLine[]): TrendAreaCount[] {
  const offered = new Set<TrendLine>(trendLineOptions(points).map((option) => option.value));
  return FOLDED_SCORE_KINDS.filter((kind) => lines.includes(kind) && offered.has(kind)).map((kind) => ({
    kind,
    label: foldedKindLabel(kind, true),
    values: points.map((point) => (point.counts ? foldedCount(point.counts, kind) : null)),
  }));
}

export const TREND_LINES_LABEL = "Show";

export const TREND_LINES_OFF = "Turn on a line to see it.";

export const formatScore = formatOneDecimal;
export const formatPutts = formatOneDecimal;
export const formatGreens = (value: number) => formatPercent(value);

export function parLabel(par: number): string {
  return `Par ${par}`;
}

export interface ParTypeBar {
  par: number;
  label: string;
  value: string;
  fill: number;
  mark: number | null;
  tone: "success" | "bad" | "primary";
}

const VERDICT_TONE = { ahead: "success", behind: "bad", even: "primary" } as const;

const PAR_SCALE = 2;

const along = (toPar: number) => Math.min(100, Math.max(0, (toPar / PAR_SCALE) * 100));

export function parTypeBars(rows: readonly ParTypeComparison[]): ParTypeBar[] {
  return rows.flatMap((row) =>
    row.averageToPar == null
      ? []
      : [
          {
            par: row.par,
            label: parLabel(row.par),
            value: formatAverageToPar(row.averageToPar),
            fill: along(row.averageToPar),
            mark: row.benchmarkToPar != null ? along(row.benchmarkToPar) : null,
            tone: row.verdict != null ? VERDICT_TONE[row.verdict] : "primary",
          },
        ],
  );
}

export function benchmarkNote(handicap: number | null): string | null {
  if (handicap == null) return null;
  return `Tick = ${handicapName(handicap).toLowerCase()}`;
}

export function difficultyColumns(holes: readonly HoleDifficulty[]): Column[] {
  return holes.map((hole) => ({
    key: String(hole.handicap),
    value: Math.max(0, hole.averageToPar),
    marked: hole.hardest,
    label: String(hole.handicap),
  }));
}

export function threePuttColumns(rounds: readonly ThreePuttRound[]): Column[] {
  return rounds.map((round, i) => ({ key: String(i), value: round.count, marked: round.costly }));
}

export const GIR_SPLIT_LABEL: Record<GirSplit["bucket"], string> = {
  GIR: "Green hit",
  "No GIR": "Green missed",
};

export function holesLabel(count: number): string {
  return pluralize(count, "hole");
}

export function puttsPerHoleSegments(putts: PuttsPerHole): ShareSegment[] {
  return [
    { key: "one", share: putts.oneOrFewer, tone: "birdie", label: "1 putt" },
    { key: "two", share: putts.two, tone: "par", label: "2 putts" },
    { key: "three", share: putts.threeOrMore, tone: "bogey", label: "3+ putts" },
  ];
}

export interface ShortGameBar {
  label: string;
  value: string;
  fill: number | null;
  tour: string | null;
  mark: number | null;
}

export function shortGameBars(game: {
  scrambling: number | null;
  upAndDown: number | null;
  tourScrambling: number | null;
  tourUpAndDown: number | null;
}): ShortGameBar[] {
  return [
    { label: "Scrambling", value: game.scrambling, tour: game.tourScrambling },
    { label: "Up & down", value: game.upAndDown, tour: game.tourUpAndDown },
  ].map((row) => ({
    label: row.label,
    value: formatPercent(row.value),
    fill: row.value,
    tour: row.tour != null ? formatPercent(row.tour) : null,
    mark: row.tour,
  }));
}

export interface BucketCard {
  key: string;
  range: string;
  holes: string;
  toPar: string;
  greens: string;
  tone: "bad" | "neutral";
  mix: ScoreMix;
}

export function bucketCards(buckets: readonly YardageBucket[], par: number): BucketCard[] {
  return buckets
    .filter((bucket) => bucket.par === par)
    .map((bucket) => ({
      key: `${bucket.par}-${bucket.label}`,
      range: bucket.label,
      holes: holesLabel(bucket.holes),
      toPar: formatAverageToPar(bucket.averageToPar),
      greens: formatPercent(bucket.girPercent),
      tone: bucket.worst ? ("bad" as const) : ("neutral" as const),
      mix: bucket.mix,
    }));
}

export const APPROACH_EMPTY = "Play rounds on courses with yardages to see how you score from each distance.";

export function threePuttAverage(perRound: number | null): string {
  return formatOneDecimal(perRound);
}

export function puttingFigures(analytics: Analytics): (Omit<HeadlineTile, "metric" | "trend"> & { key: string })[] {
  const tiles = headlineTiles(analytics.headline);
  const putts = tiles.find((tile) => tile.metric === "average_putts");
  const threes = tiles.find((tile) => tile.metric === "three_putt_rate");
  return [
    ...(putts ? [{ ...putts, key: putts.metric }] : []),
    {
      key: "putts_per_gir",
      label: "Putts / GIR",
      value: formatOneDecimal(analytics.kpis.putts_per_gir),
      delta: "",
      direction: null,
      tone: "neutral" as const,
    },
    ...(threes ? [{ ...threes, key: threes.metric }] : []),
  ];
}
