import type { HoleScoreDto, NinesDto, RoundDto, RoundSummaryDto, ScoreCountsDto } from "@/types/api";
import type { Course } from "@/types/golf";
import { BACK_HOLES, FRONT_HOLES, coursePar, getHole, getTee, teeYards } from "./course";
import { SCORE_KINDS, scoreKind, strokesToPar, type ScoreKind } from "./score";

/** One hole as played. Par, handicap, yardage, to-par and kind come from the server. */
export interface HoleScore {
  hole: number;
  par: number | null;
  /** The hole's stroke index. */
  handicap: number | null;
  /** From the tee played. */
  yardage: number | null;
  strokes: number | null;
  putts: number | null;
  gir: boolean | null;
  fairway: boolean | null;
  toPar: number | null;
  kind: ScoreKind | null;
}

export interface Nine {
  holes: HoleScore[];
  /** Null until all nine holes are scored. */
  total: number | null;
  /** Null until every hole has a par. */
  par: number | null;
  toPar: number | null;
  /** Null if any scored hole is missing putts. */
  putts: number | null;
  gir: number | null;
  /** Null until every hole has a yardage. */
  yards: number | null;
}

/** Where a round was played. A round not linked to a course keeps the card's name and no id. */
export interface RoundCourse {
  id: string | null;
  name: string | null;
  location: string | null;
  par: number | null;
}

export type ScoreCounts = ScoreCountsDto;

/** A round and its figures, as the server worked them out. */
export interface Round {
  id: string;
  date: string | null;
  course: RoundCourse | null;
  teeBox: string | null;
  holes: HoleScore[];
  frontNine: Nine;
  backNine: Nine;
  score: number | null;
  par: number | null;
  toPar: number | null;
  putts: number | null;
  gir: number | null;
  /** The tee played's length. */
  yards: number | null;
  scoreCounts: ScoreCounts;
}

/** Unsaved changes to holes. A field left undefined keeps the hole's own value. */
export type HoleEdits = Record<number, { strokes?: number | null; putts?: number | null; gir?: boolean | null }>;

function holeScore(dto: HoleScoreDto): HoleScore {
  return {
    hole: dto.hole_number,
    par: dto.par,
    handicap: dto.handicap,
    yardage: dto.yardage,
    strokes: dto.strokes,
    putts: dto.putts,
    gir: dto.green_in_regulation,
    fairway: dto.fairway_hit,
    toPar: dto.to_par,
    kind: dto.kind,
  };
}

function nines(
  holes: HoleScore[],
  front: number | null,
  back: number | null,
  figures: NinesDto,
): Pick<Round, "frontNine" | "backNine"> {
  const nine = (onNine: HoleScore[], total: number | null, sent: NinesDto["front"]): Nine => ({
    holes: onNine,
    total,
    par: sent.par,
    toPar: sent.to_par,
    putts: sent.putts,
    gir: sent.gir,
    yards: sent.yards,
  });
  return {
    frontNine: nine(holes.filter((hole) => hole.hole <= 9), front, figures.front),
    backNine: nine(holes.filter((hole) => hole.hole >= 10), back, figures.back),
  };
}

function fromSummary(dto: RoundSummaryDto): Round {
  const holes = dto.hole_scores.map(holeScore);
  return {
    id: dto.id,
    date: dto.date,
    course: { id: dto.course_id, name: dto.course_name, location: dto.course_location, par: dto.course_par },
    teeBox: dto.tee_box,
    holes,
    ...nines(holes, dto.front_nine, dto.back_nine, dto.nines),
    score: dto.total_score,
    par: dto.par,
    toPar: dto.to_par,
    putts: dto.total_putts,
    gir: dto.total_gir,
    yards: dto.yards,
    scoreCounts: dto.score_counts,
  };
}

function fromDto(dto: RoundDto): Round {
  const holes = dto.hole_scores.map(holeScore);
  const course = dto.course;
  return {
    id: dto.id ?? "",
    date: dto.date,
    course: {
      id: course?.id ?? null,
      name: dto.course_name_played ?? course?.name ?? null,
      location: course?.location ?? null,
      par: course?.par ?? null,
    },
    teeBox: dto.tee_box,
    holes,
    ...nines(holes, dto.front_nine, dto.back_nine, dto.nines),
    score: dto.total_score,
    par: dto.par,
    toPar: dto.to_par,
    putts: dto.total_putts,
    gir: dto.total_gir,
    yards: dto.yards,
    scoreCounts: dto.score_counts,
  };
}

function nineTotal(holes: HoleScore[]): number | null {
  if (holes.length !== 9 || holes.some((hole) => hole.strokes == null)) return null;
  return holes.reduce((sum, hole) => sum + hole.strokes!, 0);
}

function allOrNull(values: (number | null | undefined)[]): number | null {
  if (values.some((value) => value == null)) return null;
  return values.reduce<number>((sum, value) => sum + value!, 0);
}

function puttsOf(holes: HoleScore[]): number | null {
  const scored = holes.filter((hole) => hole.strokes != null);
  if (scored.length === 0 || scored.some((hole) => hole.putts == null)) return null;
  return scored.reduce((sum, hole) => sum + hole.putts!, 0);
}

function girOf(holes: HoleScore[]): number | null {
  const recorded = holes.filter((hole) => hole.gir != null);
  return recorded.length > 0 ? recorded.filter((hole) => hole.gir).length : null;
}

/**
 * The round as it would read with unsaved edits: new strokes, putts or greens, or a different
 * course and tee. This is the one place the frontend works out golf figures, and only until the
 * edit is saved; it follows the server's rules (models/round.py) and the saved response replaces it.
 */
function previewEdits(round: Round, edits: HoleEdits, course?: Course | null, teeBox?: string | null): Round {
  const tee = getTee(course, teeBox);
  // A course picked without a matching tee has no yardages yet. The round's own course keeps the
  // server's, which may come from the golfer's own tee.
  const yardsCleared = !tee && !!course && course.id !== round.course?.id;
  const yardageOf = (hole: number, current: number | null) =>
    tee ? tee.hole_yardages[hole] ?? null : yardsCleared ? null : current;

  const holes = round.holes.map((hole) => {
    const edit = edits[hole.hole];
    const strokes = edit?.strokes !== undefined ? edit.strokes : hole.strokes;
    const putts = edit?.putts !== undefined ? edit.putts : hole.putts;
    const gir = edit?.gir !== undefined ? edit.gir : hole.gir;
    const courseHole = getHole(course, hole.hole);
    const par = courseHole?.par ?? hole.par;
    return {
      ...hole,
      strokes,
      putts,
      gir,
      par,
      handicap: courseHole?.handicap ?? hole.handicap,
      yardage: yardageOf(hole.hole, hole.yardage),
      toPar: strokesToPar(strokes, par),
      kind: scoreKind(strokes, par),
    };
  });

  const nine = (numbers: readonly number[], before: Nine): Nine => {
    const onNine = holes.filter((hole) => numbers.includes(hole.hole));
    const total = nineTotal(onNine);
    const par = course
      ? allOrNull(numbers.map((n) => getHole(course, n)?.par ?? onNine.find((h) => h.hole === n)?.par))
      : before.par;
    const yards = tee
      ? allOrNull(numbers.map((n) => tee.hole_yardages[n]))
      : yardsCleared ? null : before.yards;
    return { holes: onNine, total, par, toPar: strokesToPar(total, par), putts: puttsOf(onNine), gir: girOf(onNine), yards };
  };

  // A round can store its own putt and green totals, so they stand until a hole's putts or green changes.
  const puttsEdited = holes.some((hole, i) => hole.putts !== round.holes[i].putts);
  const girEdited = holes.some((hole, i) => hole.gir !== round.holes[i].gir);
  const scored = holes.filter((hole) => hole.strokes != null);
  const score = scored.length > 0 ? scored.reduce((sum, hole) => sum + hole.strokes!, 0) : null;
  const par = course ? coursePar(course) ?? round.par : round.par;
  const scoreCounts = Object.fromEntries(SCORE_KINDS.map((kind) => [kind, 0])) as ScoreCounts;
  for (const hole of holes) if (hole.kind) scoreCounts[hole.kind] += 1;
  return {
    ...round,
    holes,
    frontNine: nine(FRONT_HOLES, round.frontNine),
    backNine: nine(BACK_HOLES, round.backNine),
    score,
    par,
    toPar: strokesToPar(score, par),
    putts: puttsEdited ? puttsOf(holes) : round.putts,
    gir: girEdited ? girOf(holes) : round.gir,
    yards: tee ? teeYards(tee) : yardsCleared ? null : round.yards,
    scoreCounts,
  };
}

export const Round = { fromSummary, fromDto, previewEdits };
