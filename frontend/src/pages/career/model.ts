import { buildRadarData, trendPointsFrom, type RadarEntry, type RoundTrendPoint, type ScoreMix } from "@/domain";
import type { AnalyticsFilters } from "@/types/analytics";
import type { AnalyticsDto, MilestoneEventDto, NotableAchievementsDto } from "@/types/api";
import { scoreMixByKindFrom, scoreMixFrom } from "../analytics/model";

/**
 * Career reads every round the server will send, at every course, all time. It is the same
 * request as the Analytics page's "All" rounds, so the two share one cache entry.
 */
export const CAREER_FILTERS: AnalyticsFilters = { limit: 500, timeframe: "all", courseId: "all" };

/** Every round, or only the last `windowDays` of them, as the server splits its records. */
export const CAREER_WINDOWS = ["lifetime", "one_year"] as const;
export type CareerWindow = (typeof CAREER_WINDOWS)[number];

/** The milestone lists. The phone shows one at a time; desktop shows them all. */
export const MILESTONE_GROUPS = ["scoring", "putting", "gir"] as const;
export type MilestoneGroup = (typeof MILESTONE_GROUPS)[number];

/** The round a record or milestone was set in. `date` is the server's, as 2026/5/28. */
export interface CareerEvent {
  date: string;
  course: string;
  roundId: string | null;
}

export type RecordKind =
  | "lowest-round"
  | "most-birdies"
  | "most-gir"
  | "fewest-putts"
  | "birdie-streak"
  | "par-streak";

/** One record over the window, and the round it was set in. Null until a round sets it. */
export interface CareerRecord {
  kind: RecordKind;
  value: number | null;
  event: CareerEvent | null;
}

export type TotalKind =
  | "rounds"
  | "birdies"
  | "eagles"
  | "pars"
  | "bogeys"
  | "doubles"
  | "triples"
  | "quads"
  | "gir"
  | "three-putts"
  | "hole-in-ones";

export interface CareerTotal {
  kind: TotalKind;
  value: number;
}

/** A milestone, reached or not. `roundId` is the round it was first reached in. */
export type Milestone = (
  | { kind: "score-break" | "putt-break" | "gir-break"; threshold: number }
  | { kind: "under-par" | "first-eagle" | "hole-in-one" }
) & { achieved: boolean; roundId: string | null };

/** The records, totals and milestones over one window. */
export interface CareerWindowFigures {
  records: CareerRecord[];
  totals: CareerTotal[];
  /**
   * Score milestones. Over a lifetime, every one, reached or not. Over the last year, only the
   * personal records the server says were set in it.
   */
  scoring: Milestone[];
  /** How many new personal records the server counted in the window; null over a lifetime. */
  newRecords: number | null;
  putting: Milestone[];
  gir: Milestone[];
}

/** The career page's figures, from the server's analytics over every round. */
export interface Career {
  roundCount: number;
  holesPlayed: number;
  handicapIndex: number | null;
  /** The index after each round, oldest first. */
  handicapTrend: RoundTrendPoint[];
  /** Each score kind's share of every counted hole. */
  scoreMix: ScoreMix;
  /** The radar's axes the golfer has figures for. */
  profile: RadarEntry[];
  /** How many days "the last year" spans. */
  windowDays: number;
  windows: Record<CareerWindow, CareerWindowFigures>;
}

type Achievements = NotableAchievementsDto;

function eventFrom(event: MilestoneEventDto | null | undefined): CareerEvent | null {
  return event ? { date: event.date, course: event.course, roundId: event.round_id ?? null } : null;
}

/** The server's event date (2026/5/28) as a UTC day, or null when it can't be read. */
export function eventDay(date: string): Date | null {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(date);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether an event falls in the last `days` days before `today`. */
export function withinDays(event: CareerEvent | null, days: number, today: Date): boolean {
  const day = event ? eventDay(event.date) : null;
  return day != null && day.getTime() >= today.getTime() - days * DAY_MS;
}

function recordsFrom(a: Achievements, timeWindow: CareerWindow): CareerRecord[] {
  const scoring = a.scoring_records[timeWindow];
  const scoringEvents = a.scoring_records_events[timeWindow];
  const streaks = a.best_performance_streaks[timeWindow];
  const streakEvents = a.best_performance_streaks_events[timeWindow];
  return [
    { kind: "lowest-round", value: scoring.lowest_round ?? null, event: eventFrom(scoringEvents.lowest_round) },
    {
      kind: "most-birdies",
      value: scoring.most_birdies_in_round ?? null,
      event: eventFrom(scoringEvents.most_birdies_in_round),
    },
    { kind: "most-gir", value: scoring.most_gir_in_round ?? null, event: eventFrom(scoringEvents.most_gir_in_round) },
    {
      kind: "fewest-putts",
      value: scoring.fewest_putts_in_round ?? null,
      event: eventFrom(scoringEvents.fewest_putts_in_round),
    },
    {
      kind: "birdie-streak",
      value: streaks.longest_birdie_streak,
      event: eventFrom(streakEvents.longest_birdie_streak),
    },
    { kind: "par-streak", value: streaks.longest_par_streak, event: eventFrom(streakEvents.longest_par_streak) },
  ];
}

function totalsFrom(a: Achievements, timeWindow: CareerWindow): CareerTotal[] {
  if (timeWindow === "lifetime") {
    const t = a.career_totals.lifetime;
    return [
      { kind: "rounds", value: t.total_rounds_played },
      { kind: "birdies", value: t.total_birdies },
      { kind: "eagles", value: t.total_eagles },
      { kind: "pars", value: t.total_pars },
      { kind: "bogeys", value: t.total_bogeys },
      { kind: "doubles", value: t.total_double_bogeys },
      { kind: "gir", value: t.total_gir },
      { kind: "three-putts", value: t.total_3_putts },
      { kind: "hole-in-ones", value: t.total_hole_in_ones },
    ];
  }
  // The server counts pars and bogeys over a lifetime only.
  const t = a.career_totals.one_year;
  return [
    { kind: "rounds", value: t.rounds_played },
    { kind: "birdies", value: t.birdies },
    { kind: "eagles", value: t.eagles },
    { kind: "gir", value: t.gir },
    { kind: "three-putts", value: t.three_putts },
    { kind: "doubles", value: t.double_bogeys },
    { kind: "triples", value: t.triple_bogeys },
    { kind: "quads", value: t.quad_bogeys_plus },
    { kind: "hole-in-ones", value: t.hole_in_ones },
  ];
}

/** Breaking 70 and under reads after a round under par, so the list climbs in order. */
const UNDER_PAR_AFTER = 70;

function lifetimeScoring(a: Achievements): Milestone[] {
  const m = a.round_milestones.lifetime;
  const breaks = (rows: typeof m.score_breaks): Milestone[] =>
    rows.map((row) => ({
      kind: "score-break",
      threshold: row.threshold,
      achieved: row.achievement != null,
      roundId: row.achievement?.round_id ?? null,
    }));
  const first = (kind: "under-par" | "first-eagle" | "hole-in-one", event: MilestoneEventDto | null | undefined): Milestone => ({
    kind,
    achieved: event != null,
    roundId: event?.round_id ?? null,
  });
  return [
    ...breaks(m.score_breaks.filter((row) => row.threshold > UNDER_PAR_AFTER)),
    first("under-par", m.first_round_under_par),
    ...breaks(m.score_breaks.filter((row) => row.threshold <= UNDER_PAR_AFTER)),
    first("first-eagle", m.first_eagle),
    first("hole-in-one", m.first_hole_in_one),
  ];
}

/** The server's personal records for the last year ("break_90", "first_eagle"), in its order. */
function newRecordsFrom(a: Achievements, lifetime: Milestone[]): Milestone[] {
  const find = (key: string): Milestone | undefined => {
    const breakMatch = /^break_(\d+)$/.exec(key);
    if (breakMatch) {
      const threshold = Number(breakMatch[1]);
      return lifetime.find((m) => m.kind === "score-break" && m.threshold === threshold);
    }
    const kind = ({ first_round_under_par: "under-par", first_eagle: "first-eagle", first_hole_in_one: "hole-in-one" } as const)[
      key as "first_round_under_par" | "first_eagle" | "first_hole_in_one"
    ];
    return kind ? lifetime.find((m) => m.kind === kind) : undefined;
  };
  return a.round_milestones.one_year.new_personal_records_achieved
    .map(find)
    .filter((m): m is Milestone => m != null)
    .map((m) => ({ ...m, achieved: true }));
}

type ThresholdRow = Achievements["putting_milestones"]["lifetime"]["putt_breaks"][number];

/**
 * Putt and GIR milestones. Over the last year, one counts when it was first reached in that
 * time: the server only sends how many were, so the client reads each one's date.
 */
function thresholdMilestones(
  rows: ThresholdRow[],
  kind: "putt-break" | "gir-break",
  timeWindow: CareerWindow,
  windowDays: number,
  today: Date,
): Milestone[] {
  return rows.map((row) => {
    const event = eventFrom(row.achievement);
    return {
      kind,
      threshold: row.threshold,
      achieved: timeWindow === "lifetime" ? event != null : withinDays(event, windowDays, today),
      roundId: event?.roundId ?? null,
    };
  });
}

function windowFrom(a: Achievements, timeWindow: CareerWindow, today: Date): CareerWindowFigures {
  const lifetime = lifetimeScoring(a);
  return {
    records: recordsFrom(a, timeWindow),
    totals: totalsFrom(a, timeWindow),
    scoring: timeWindow === "lifetime" ? lifetime : newRecordsFrom(a, lifetime),
    newRecords: timeWindow === "lifetime" ? null : a.round_milestones.one_year.new_personal_records_achieved_count,
    putting: thresholdMilestones(a.putting_milestones.lifetime.putt_breaks, "putt-break", timeWindow, a.window_days, today),
    gir: thresholdMilestones(a.gir_milestones.lifetime.gir_breaks, "gir-break", timeWindow, a.window_days, today),
  };
}

/** The career page's figures from the server's analytics over every round. */
export function careerFrom(dto: AnalyticsDto, today: Date): Career {
  const a = dto.notable_achievements;
  return {
    roundCount: dto.kpis.total_rounds,
    holesPlayed: a.career_totals.lifetime.total_holes_played,
    handicapIndex: dto.kpis.handicap_index ?? null,
    handicapTrend: trendPointsFrom(dto),
    // Weighted over every round's holes on the client, as Analytics does. A follow-up for the server.
    scoreMix: scoreMixByKindFrom(scoreMixFrom(dto.score_type_distribution)),
    profile: buildRadarData(dto.kpis, dto.scoring_by_par).filter((entry) => entry.hasData),
    windowDays: a.window_days,
    windows: {
      lifetime: windowFrom(a, "lifetime", today),
      one_year: windowFrom(a, "one_year", today),
    },
  };
}
