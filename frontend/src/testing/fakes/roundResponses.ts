import type { HoleScoreDto, RoundDto, RoundSummaryDto, ScoreCountsDto, UserTeeDto } from "../../types/api";
import { coursePar, courseResponse, type StoredCourse } from "./courseResponses";

/**
 * The fake backend's copy of api/round_responses.py and models/round.py: a round is stored as
 * facts, and every response carries the figures the real server works out from them.
 */

export interface StoredHole {
  hole_number: number;
  strokes: number | null;
  putts: number | null;
  fairway_hit: boolean | null;
  green_in_regulation: boolean | null;
  par_played: number | null;
  handicap_played: number | null;
}

export interface StoredRound {
  id: string;
  course: StoredCourse | null;
  tee_box: string | null;
  date: string | null;
  hole_scores: StoredHole[];
  notes: string | null;
  weather_conditions: string | null;
  course_name_played: string | null;
  user_tee: UserTeeDto | null;
}

type ScoreKind = NonNullable<HoleScoreDto["kind"]>;

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function holePar(round: StoredRound, hole: StoredHole): number | null {
  return round.course?.holes.find((h) => h.number === hole.hole_number)?.par ?? hole.par_played;
}

function holeHandicap(round: StoredRound, hole: StoredHole): number | null {
  return round.course?.holes.find((h) => h.number === hole.hole_number)?.handicap ?? hole.handicap_played;
}

/** The course's tee for the round's tee box, else the user's own tee. */
function teePlayed(
  round: StoredRound,
): { total_yardage?: number | null; hole_yardages: Record<string, number>; course_handicap?: number | null } | null {
  const color = round.tee_box?.toLowerCase();
  const tee = color ? round.course?.tees.find((t) => t.color?.toLowerCase() === color) : undefined;
  return tee ?? round.user_tee ?? null;
}

function holeYardage(round: StoredRound, holeNumber: number): number | null {
  return teePlayed(round)?.hole_yardages[holeNumber] ?? null;
}

function totalYardage(round: StoredRound): number | null {
  const tee = teePlayed(round);
  if (!tee) return null;
  if (tee.total_yardage != null) return tee.total_yardage;
  const yards = Object.values(tee.hole_yardages);
  return yards.length > 0 ? sum(yards) : null;
}

function kindFor(toPar: number | null): ScoreKind | null {
  if (toPar == null) return null;
  if (toPar <= -2) return "eagle";
  if (toPar >= 4) return "quad";
  return (["birdie", "par", "bogey", "double", "triple"] as const)[toPar + 1];
}

function roundPar(round: StoredRound): number | null {
  if (round.course) return coursePar(round.course);
  const pars = round.hole_scores.map((h) => h.par_played).filter((p): p is number => p != null);
  return pars.length > 0 ? sum(pars) : null;
}

function holesPlayed(round: StoredRound): number {
  return round.hole_scores.filter((h) => h.strokes != null).length;
}

/** Strokes against the par of the holes played; a full round whose holes have no par reads against the course's. */
function toPar(round: StoredRound, total: number | null): number | null {
  if (total == null) return null;
  const pars = round.hole_scores.filter((h) => h.strokes != null).map((h) => holePar(round, h));
  const played = pars.length > 0 && pars.every((p) => p != null) ? sum(pars as number[]) : null;
  const par = played ?? (holesPlayed(round) >= 18 ? roundPar(round) : null);
  return par != null ? total - par : null;
}

/** The tee's course handicap, for a full round: tee ratings are for 18 holes. */
function courseHandicap(round: StoredRound): number | null {
  return holesPlayed(round) >= 18 ? (teePlayed(round)?.course_handicap ?? null) : null;
}

function nineTotal(holes: StoredHole[], first: number, last: number): number | null {
  const strokes = holes
    .filter((h) => h.hole_number >= first && h.hole_number <= last && h.strokes != null)
    .map((h) => h.strokes!);
  return strokes.length === 9 ? sum(strokes) : null;
}

function holeNumbers(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

function allOrNull(values: (number | null)[]): number | null {
  return values.some((v) => v == null) ? null : sum(values as number[]);
}

function nineFigures(round: StoredRound, first: number, last: number) {
  const onNine = round.hole_scores.filter((h) => h.hole_number >= first && h.hole_number <= last);
  const scored = onNine.filter((h) => h.strokes != null);
  const par = allOrNull(
    holeNumbers(first, last).map((n) => {
      const hole = round.hole_scores.find((h) => h.hole_number === n);
      return hole ? holePar(round, hole) : round.course?.holes.find((h) => h.number === n)?.par ?? null;
    }),
  );
  const strokes = nineTotal(round.hole_scores, first, last);
  return {
    par,
    to_par: strokes != null && par != null ? strokes - par : null,
    putts: scored.length > 0 && scored.every((h) => h.putts != null) ? sum(scored.map((h) => h.putts!)) : null,
    gir: countTrue(onNine.map((h) => h.green_in_regulation)),
    yards: allOrNull(holeNumbers(first, last).map((n) => holeYardage(round, n))),
  };
}

function countTrue(values: (boolean | null)[]): number | null {
  const recorded = values.filter((v): v is boolean => v != null);
  return recorded.length > 0 ? recorded.filter(Boolean).length : null;
}

function holeToPar(round: StoredRound, hole: StoredHole): number | null {
  const par = holePar(round, hole);
  return hole.strokes != null && par != null ? hole.strokes - par : null;
}

/** Round.running_to_par: the round's to par after each hole, skipping holes without one. */
function runningToPar(round: StoredRound): Map<number, number> {
  const running = new Map<number, number>();
  let total = 0;
  for (const hole of [...round.hole_scores].sort((a, b) => a.hole_number - b.hole_number)) {
    const toPar = holeToPar(round, hole);
    if (toPar == null) continue;
    total += toPar;
    running.set(hole.hole_number, total);
  }
  return running;
}

/** Round.worst_stretch: four straight holes that lost the most, two or more; the earliest on a tie. */
function worstStretch(round: StoredRound): RoundDto["worst_stretch"] {
  const toPar = new Map(round.hole_scores.map((hole) => [hole.hole_number, holeToPar(round, hole)]));
  let worst: RoundDto["worst_stretch"] = null;
  for (const first of [...toPar.keys()].sort((a, b) => a - b)) {
    const run = holeNumbers(first, first + 3).map((n) => toPar.get(n));
    if (run.some((v) => v == null)) continue;
    const over = sum(run as number[]);
    if (over >= 2 && (worst == null || over > worst.to_par)) worst = { first_hole: first, last_hole: first + 3, to_par: over };
  }
  return worst;
}

function holeResponses(round: StoredRound): HoleScoreDto[] {
  const running = runningToPar(round);
  return round.hole_scores.map((hole) => {
    const par = holePar(round, hole);
    const toPar = holeToPar(round, hole);
    return {
      ...hole,
      net_score: null,
      shots_to_green: null,
      par,
      handicap: holeHandicap(round, hole),
      yardage: holeYardage(round, hole.hole_number),
      to_par: toPar,
      kind: kindFor(toPar),
      three_putt: hole.putts != null && hole.putts >= 3,
      running_to_par: running.get(hole.hole_number) ?? null,
    };
  });
}

function figures(round: StoredRound, holes: HoleScoreDto[]) {
  const scored = round.hole_scores.filter((h) => h.strokes != null);
  const total = scored.length > 0 ? sum(scored.map((h) => h.strokes!)) : null;
  const scoreCounts: ScoreCountsDto = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0 };
  for (const hole of holes) if (hole.kind) scoreCounts[hole.kind] += 1;
  return {
    total_score: total,
    par: roundPar(round),
    to_par: toPar(round, total),
    front_nine: nineTotal(round.hole_scores, 1, 9),
    back_nine: nineTotal(round.hole_scores, 10, 18),
    total_putts:
      scored.length > 0 && scored.every((h) => h.putts != null) ? sum(scored.map((h) => h.putts!)) : null,
    total_gir: countTrue(round.hole_scores.map((h) => h.green_in_regulation)),
    fairways_hit: countTrue(round.hole_scores.map((h) => h.fairway_hit)),
    nines: { front: nineFigures(round, 1, 9), back: nineFigures(round, 10, 18) },
    yards: totalYardage(round),
    score_counts: scoreCounts,
    holes_played: holesPlayed(round),
  };
}

export function roundResponse(round: StoredRound): RoundDto {
  const holes = holeResponses(round);
  const figured = figures(round, holes);
  const handicap = courseHandicap(round);
  return {
    ...round,
    ...figured,
    course: round.course ? courseResponse(round.course) : null,
    hole_scores: holes,
    course_handicap: handicap,
    net_score: handicap != null && figured.total_score != null ? figured.total_score - handicap : null,
    worst_stretch: worstStretch(round),
  };
}

/**
 * Each round's place in the list's Best and Worst orders, as `analytics.stats.best_round_ranks`
 * and `worst_round_ranks` give them: full rounds by to par, best or worst first, then nines and
 * rounds cut short the same way. Ties keep the list's order.
 */
export function listRanks(rounds: StoredRound[]): { best: number | null; worst: number | null }[] {
  const keyed = rounds.map((round, i) => {
    const scored = round.hole_scores.filter((h) => h.strokes != null);
    const total = scored.length > 0 ? sum(scored.map((h) => h.strokes!)) : null;
    return { i, short: holesPlayed(round) < 18, toPar: toPar(round, total) };
  });
  const placed = keyed.filter((k) => k.toPar != null);
  const place = (direction: 1 | -1) => {
    const ranks: (number | null)[] = rounds.map(() => null);
    [...placed]
      .sort((a, b) => Number(a.short) - Number(b.short) || direction * (a.toPar! - b.toPar!) || a.i - b.i)
      .forEach((k, at) => (ranks[k.i] = at + 1));
    return ranks;
  };
  const best = place(1);
  const worst = place(-1);
  return rounds.map((_, i) => ({ best: best[i] ?? null, worst: worst[i] ?? null }));
}

export function summaryResponse(
  round: StoredRound,
  ranks: { best: number | null; worst: number | null } = { best: null, worst: null },
): RoundSummaryDto {
  const holes = holeResponses(round);
  const { total_score, to_par, front_nine, back_nine, total_putts, score_counts } = figures(round, holes);
  return {
    id: round.id,
    course_id: round.course?.id ?? null,
    course_name: round.course_name_played ?? round.course?.name ?? null,
    tee_box: round.tee_box,
    date: round.date,
    total_score,
    to_par,
    front_nine,
    back_nine,
    total_putts,
    score_counts,
    hole_scores: holes.map(({ hole_number, strokes, kind, running_to_par }) => ({ hole_number, strokes, kind, running_to_par })),
    best_rank: ranks.best,
    worst_rank: ranks.worst,
  };
}

function storedHoles(holes: HoleScoreDto[]): StoredHole[] {
  return holes.map((h) => ({
    hole_number: h.hole_number,
    strokes: h.strokes,
    putts: h.putts,
    fairway_hit: h.fairway_hit,
    green_in_regulation: h.green_in_regulation,
    par_played: h.par_played,
    handicap_played: h.handicap_played,
  }));
}

export function storedFromRound(round: RoundDto): StoredRound {
  return {
    id: round.id ?? "",
    course: round.course,
    tee_box: round.tee_box,
    date: round.date,
    hole_scores: storedHoles(round.hole_scores),
    notes: round.notes,
    weather_conditions: round.weather_conditions,
    course_name_played: round.course_name_played,
    user_tee: round.user_tee,
  };
}
