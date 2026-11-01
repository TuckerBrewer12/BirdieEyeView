import { toParLabel, type ScoreKind } from "@/domain";
import type { GIRvsNonGIRRow } from "@/types/analytics";
import { insightCategory, type AnalyticsTab, type Insight, type InsightCategory } from "./model";

export const TAB_LABELS: Record<AnalyticsTab, string> = {
  scoring: "Scoring",
  "ball-striking": "Ball Striking",
  putting: "Putting",
  profile: "Profile",
  range: "Range View",
};

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

export type GirVsNonGirBar = { bucket: GIRvsNonGIRRow["bucket"] } & Record<ScoreKind, number>;

/** GIR vs no-GIR as diverging bars keyed by score kind: under par left of zero, par and over to the right. */
export function girVsNonGirBars(rows: GIRvsNonGIRRow[]): GirVsNonGirBar[] {
  return rows.map((row) => ({
    bucket: row.bucket,
    eagle: -row.eagle,
    birdie: -row.birdie,
    par: row.par,
    bogey: row.bogey,
    double: row.double_bogey,
    triple: row.triple_bogey,
    quad: row.quad_bogey,
  }));
}
