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

function nineTotal(holes: StoredHole[], first: number, last: number): number | null {
  const strokes = holes
    .filter((h) => h.hole_number >= first && h.hole_number <= last && h.strokes != null)
    .map((h) => h.strokes!);
  return strokes.length === 9 ? sum(strokes) : null;
}

function countTrue(values: (boolean | null)[]): number | null {
  const recorded = values.filter((v): v is boolean => v != null);
  return recorded.length > 0 ? recorded.filter(Boolean).length : null;
}

function holeResponses(round: StoredRound): HoleScoreDto[] {
  return round.hole_scores.map((hole) => {
    const par = holePar(round, hole);
    const toPar = hole.strokes != null && par != null ? hole.strokes - par : null;
    return {
      ...hole,
      net_score: null,
      shots_to_green: null,
      handicap_played: null,
      par,
      to_par: toPar,
      kind: kindFor(toPar),
    };
  });
}

function figures(round: StoredRound, holes: HoleScoreDto[]) {
  const scored = round.hole_scores.filter((h) => h.strokes != null);
  const total = scored.length > 0 ? sum(scored.map((h) => h.strokes!)) : null;
  const par = roundPar(round);
  const scoreCounts: ScoreCountsDto = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0 };
  for (const hole of holes) if (hole.kind) scoreCounts[hole.kind] += 1;
  return {
    total_score: total,
    par,
    to_par: total != null && par != null ? total - par : null,
    front_nine: nineTotal(round.hole_scores, 1, 9),
    back_nine: nineTotal(round.hole_scores, 10, 18),
    total_putts:
      scored.length > 0 && scored.every((h) => h.putts != null) ? sum(scored.map((h) => h.putts!)) : null,
    total_gir: countTrue(round.hole_scores.map((h) => h.green_in_regulation)),
    fairways_hit: countTrue(round.hole_scores.map((h) => h.fairway_hit)),
    score_counts: scoreCounts,
  };
}

export function roundResponse(round: StoredRound): RoundDto {
  const holes = holeResponses(round);
  return {
    ...round,
    ...figures(round, holes),
    course: round.course ? courseResponse(round.course) : null,
    hole_scores: holes,
  };
}

export function summaryResponse(round: StoredRound): RoundSummaryDto {
  const holes = holeResponses(round);
  return {
    ...figures(round, holes),
    id: round.id,
    course_id: round.course?.id ?? null,
    course_name: round.course_name_played ?? round.course?.name ?? null,
    course_location: round.course?.location ?? null,
    course_par: round.course ? coursePar(round.course) : null,
    tee_box: round.tee_box,
    date: round.date,
    notes: round.notes,
    hole_scores: holes,
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
  }));
}

/** A response seeded into the fake, back to the facts it would have been built from. */
export function storedFromSummary(summary: RoundSummaryDto): StoredRound {
  return {
    id: summary.id,
    course: summary.course_id
      ? {
          id: summary.course_id,
          name: summary.course_name,
          location: summary.course_location,
          par: summary.course_par,
          holes: [],
          tees: [],
        }
      : null,
    tee_box: summary.tee_box,
    date: summary.date,
    hole_scores: storedHoles(summary.hole_scores),
    notes: summary.notes,
    weather_conditions: null,
    course_name_played: summary.course_id ? null : summary.course_name,
    user_tee: null,
  };
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
