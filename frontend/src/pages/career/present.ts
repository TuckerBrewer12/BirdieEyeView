import type { RadarAxis } from "@/brand";
import { formatDay, pluralNoun, type RadarEntry } from "@/domain";
import type { ScoreKind } from "@/domain/score";
import {
  type CareerEvent,
  type CareerWindow,
  type Milestone,
  type MilestoneGroup,
  type RecordKind,
  type TotalKind,
} from "./model";

export function windowLabel(timeWindow: CareerWindow, windowDays: number): string {
  return timeWindow === "lifetime" ? "Lifetime" : `Last ${windowDays} Days`;
}

export function totalsTitle(timeWindow: CareerWindow): string {
  return timeWindow === "lifetime" ? "Career Totals" : "Year Totals";
}

export const RECORD_LABEL: Record<RecordKind, string> = {
  "lowest-round": "Lowest Round",
  "most-birdies": "Most Birdies",
  "most-gir": "Most GIR",
  "fewest-putts": "Fewest Putts",
  "birdie-streak": "Birdie Streak",
  "par-streak": "Par-or-Better Streak",
};

export const TOTAL_LABEL: Record<TotalKind, string> = {
  rounds: "Rounds",
  birdies: "Birdies",
  eagles: "Eagles",
  pars: "Pars",
  bogeys: "Bogeys",
  doubles: "Doubles",
  triples: "Triples",
  quads: "Quad+",
  gir: "GIR",
  "three-putts": "3-Putts",
  "hole-in-ones": "Hole-in-Ones",
};

export const TOTAL_SCORE_KIND: Partial<Record<TotalKind, ScoreKind>> = {
  eagles: "eagle",
  birdies: "birdie",
  pars: "par",
  bogeys: "bogey",
  doubles: "double",
  triples: "triple",
  quads: "quad",
  "hole-in-ones": "eagle",
};

export const MILESTONE_GROUP_LABEL: Record<MilestoneGroup, string> = {
  scoring: "Career",
  putting: "Putting",
  gir: "GIR",
};

export const MILESTONE_GROUP_TITLE: Record<MilestoneGroup, string> = {
  scoring: "Career Milestones",
  putting: "Putting Milestones",
  gir: "GIR Milestones",
};

export function milestoneLabel(milestone: Milestone): string {
  switch (milestone.kind) {
    case "score-break":
      return `Break ${milestone.threshold}`;
    case "putt-break":
      return `Break ${milestone.threshold} Putts`;
    case "gir-break":
      return `${milestone.threshold}/18 GIR`;
    case "under-par":
      return "Round Under Par";
    case "first-eagle":
      return "First Eagle";
    case "hole-in-one":
      return "Hole-in-One";
  }
}

export function milestoneKey(milestone: Milestone): string {
  return "threshold" in milestone ? `${milestone.kind}-${milestone.threshold}` : milestone.kind;
}

export function eventDetail(event: CareerEvent | null): string | null {
  if (!event) return null;
  return [formatDay(event.date) ?? event.date, event.course].filter(Boolean).join(" · ");
}

export function recordValue(value: number | null): string {
  return value != null ? String(value) : "—";
}

export function newRecordsNote(count: number, windowDays: number): string {
  return `${count} new personal ${pluralNoun(count, "record")} in the last ${windowDays} days.`;
}

export function noRoundsInWindow(windowDays: number): string {
  return `No rounds in the last ${windowDays} days.`;
}

export const NO_NEW_RECORDS = "No new records yet. Keep playing!";

export const PAGE_SUBTITLE = "Player achievement records";

export const EMPTY_MESSAGE ="Play some rounds to start your career record.";

export function profileAxes(profile: RadarEntry[]): RadarAxis[] {
  return profile.map((entry) => ({ label: entry.axis, value: entry.value, valueLabel: entry.userRaw }));
}
