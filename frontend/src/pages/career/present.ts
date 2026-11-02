import type { RadarAxis } from "@/brand";
import type { RadarEntry } from "@/domain";
import {
  eventDay,
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

/** A stable key for a milestone in its list. */
export function milestoneKey(milestone: Milestone): string {
  return "threshold" in milestone ? `${milestone.kind}-${milestone.threshold}` : milestone.kind;
}

const EVENT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Where and when a record was set: "May 25, 2026 · Presidio Golf Course". */
export function eventDetail(event: CareerEvent | null): string | null {
  if (!event) return null;
  const day = eventDay(event.date);
  return [day ? EVENT_DATE.format(day) : event.date, event.course].filter(Boolean).join(" · ");
}

export function recordValue(value: number | null): string {
  return value != null ? String(value) : "—";
}

/** The note over the last year's score milestones. */
export function newRecordsNote(count: number, windowDays: number): string {
  const records = count === 1 ? "new personal record" : "new personal records";
  return `${count} ${records} in the last ${windowDays} days.`;
}

export const NO_NEW_RECORDS = "No new records yet. Keep playing!";

export function holesLabel(holes: number): string {
  return `${holes.toLocaleString("en-US")} ${holes === 1 ? "hole" : "holes"}`;
}

export function roundsLabel(rounds: number): string {
  return `${rounds.toLocaleString("en-US")} ${rounds === 1 ? "round" : "rounds"}`;
}

export const PAGE_SUBTITLE = "Player achievement records";

export const EMPTY_MESSAGE ="Play some rounds to start your career record.";

/** The radar's spokes: the golfer's own shape, labelled with their figures. */
export function profileAxes(profile: RadarEntry[]): RadarAxis[] {
  return profile.map((entry) => ({ label: entry.axis, value: entry.value, valueLabel: entry.userRaw }));
}
