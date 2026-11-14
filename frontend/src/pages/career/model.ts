import { buildRadarData, trendPointsFrom, type RadarEntry, type RoundTrendPoint, type ScoreMix } from "@/domain";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { AnalyticsDto, MilestoneAchievementDto, MilestoneEventDto, NotableAchievementsDto } from "@/types/api";

/**
 * Career reads every round the server will send, at every course, all time. It is the same
 * request as the Analytics page's "All" rounds, so the two share one cache entry.
 */
export const CAREER_FILTERS: AnalyticsFilters = { limit: 500, timeframe: "all", courseId: "all" };

/** Every round, or only the last `windowDays` of them, as the server splits its records and milestones. */
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

/** The handicap trend, records, totals and milestones over one window. */
export interface CareerWindowFigures {
  /** The index after each round in the window, oldest first: the rounds the server marks as in it. */
  handicapTrend: RoundTrendPoint[];
  records: CareerRecord[];
  totals: CareerTotal[];
  /**
   * Score milestones. Over a lifetime, every one, reached or not. Over the last year, only the
   * new personal records: the ones the server says were first reached in it.
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

/** Over a lifetime, a milestone counts once reached; over the last year, only if the server says it was first reached in it. */
function reached(achievement: MilestoneAchievementDto | null | undefined, timeWindow: CareerWindow): boolean {
  return timeWindow === "lifetime" ? achievement != null : achievement?.in_window === true;
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

type ThresholdRow = Achievements["round_milestones"]["lifetime"]["score_breaks"][number];

/**
 * Score milestones. Over a lifetime, every one, reached or not. Over the last year, only the
 * new personal records: the ones the server says were first reached in it.
 */
function scoringMilestones(a: Achievements, timeWindow: CareerWindow): Milestone[] {
  const m = a.round_milestones.lifetime;
  const breaks = (rows: ThresholdRow[]): Milestone[] =>
    rows.map((row) => ({
      kind: "score-break",
      threshold: row.threshold,
      achieved: reached(row.achievement, timeWindow),
      roundId: row.achievement?.round_id ?? null,
    }));
  const first = (
    kind: "under-par" | "first-eagle" | "hole-in-one",
    achievement: MilestoneAchievementDto | null | undefined,
  ): Milestone => ({ kind, achieved: reached(achievement, timeWindow), roundId: achievement?.round_id ?? null });
  // The server places a round under par among the breaks by the par the golfer plays, so the list climbs in order.
  const all = [
    ...breaks(m.score_breaks.slice(0, m.under_par_position)),
    first("under-par", m.first_round_under_par),
    ...breaks(m.score_breaks.slice(m.under_par_position)),
    first("first-eagle", m.first_eagle),
    first("hole-in-one", m.first_hole_in_one),
  ];
  return timeWindow === "lifetime" ? all : all.filter((milestone) => milestone.achieved);
}

/** Putt and GIR milestones, each reached or not over the window. */
function thresholdMilestones(rows: ThresholdRow[], kind: "putt-break" | "gir-break", timeWindow: CareerWindow): Milestone[] {
  return rows.map((row) => ({
    kind,
    threshold: row.threshold,
    achieved: reached(row.achievement, timeWindow),
    roundId: row.achievement?.round_id ?? null,
  }));
}

function windowFrom(a: Achievements, trend: RoundTrendPoint[], timeWindow: CareerWindow): CareerWindowFigures {
  return {
    handicapTrend: timeWindow === "lifetime" ? trend : trend.filter((point) => point.inWindow),
    records: recordsFrom(a, timeWindow),
    totals: totalsFrom(a, timeWindow),
    scoring: scoringMilestones(a, timeWindow),
    newRecords: timeWindow === "lifetime" ? null : a.round_milestones.one_year.new_personal_records_achieved_count,
    putting: thresholdMilestones(a.putting_milestones.lifetime.putt_breaks, "putt-break", timeWindow),
    gir: thresholdMilestones(a.gir_milestones.lifetime.gir_breaks, "gir-break", timeWindow),
  };
}

/** The career page's figures from the server's analytics over every round. */
export function careerFrom(dto: AnalyticsDto): Career {
  const a = dto.notable_achievements;
  const trend = trendPointsFrom(dto);
  return {
    roundCount: dto.kpis.total_rounds,
    holesPlayed: a.career_totals.lifetime.total_holes_played,
    handicapIndex: dto.kpis.handicap_index ?? null,
    scoreMix: dto.score_mix,
    profile: buildRadarData(dto.kpis, dto.scoring_by_par).filter((entry) => entry.hasData),
    windowDays: a.window_days,
    windows: {
      lifetime: windowFrom(a, trend, "lifetime"),
      one_year: windowFrom(a, trend, "one_year"),
    },
  };
}
