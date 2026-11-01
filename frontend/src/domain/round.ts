import type { HoleScoreDto, NinesDto, RoundDto, RoundSummaryDto, ScoreCountsDto } from "@/types/api";
import type { Course } from "@/types/golf";
import type { ExtractedRound } from "@/types/scan";
import { BACK_HOLES, FRONT_HOLES, getHole, getTee } from "./course";
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
  /** Strokes to reach the green, when the card recorded them. */
  shotsToGreen: number | null;
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

/**
 * A round as the detail page and its editor read it: the round, plus the full course it is linked
 * to (holes and tees, for editing against) and the name it was played under. `course.name` shows
 * whichever applies; these keep the two apart.
 */
export interface RoundDetail extends Round {
  linkedCourse: Course | null;
  /** The name the card was played under, when the round keeps its own name. */
  playedName: string | null;
}

/** Which course an edited round is saved against. */
export type CourseEdit =
  | { status: "linked"; course: Course }
  | { status: "custom"; name: string }
  | { status: "picking" };

/** Everything an edit changes on a round, ready to save. */
export interface RoundEdits {
  holes: HoleEdits;
  teeBox: string;
  course: CourseEdit;
}

function holeScore(dto: HoleScoreDto): HoleScore {
  return {
    hole: dto.hole_number,
    par: dto.par,
    handicap: dto.handicap,
    yardage: dto.yardage,
    strokes: dto.strokes,
    putts: dto.putts,
    gir: dto.green_in_regulation,
    shotsToGreen: dto.shots_to_green,
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

function detailFromDto(dto: RoundDto): RoundDetail {
  return { ...fromDto(dto), linkedCourse: dto.course, playedName: dto.course_name_played };
}

function nineTotal(holes: HoleScore[]): number | null {
  if (holes.length !== 9 || holes.some((hole) => hole.strokes == null)) return null;
  return holes.reduce((sum, hole) => sum + hole.strokes!, 0);
}

/** The sum, once every value is known. */
function sumIfAll(values: (number | null | undefined)[]): number | null {
  if (values.length === 0 || values.some((value) => value == null)) return null;
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
 * Where neither the server nor the course has sent a total (a scan not yet saved), it adds up the holes.
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

  // A picked course and tee send their own nine pars and yardages.
  const nine = (numbers: readonly number[], before: Nine, coursePar?: number | null, teeYards?: number | null): Nine => {
    const onNine = holes.filter((hole) => numbers.includes(hole.hole));
    const total = nineTotal(onNine);
    const par = (course ? coursePar : before.par) ?? sumIfAll(onNine.length === 9 ? onNine.map((hole) => hole.par) : []);
    const yards = tee
      ? teeYards ?? sumIfAll(onNine.length === 9 ? onNine.map((hole) => hole.yardage) : [])
      : yardsCleared ? null : before.yards;
    return { holes: onNine, total, par, toPar: strokesToPar(total, par), putts: puttsOf(onNine), gir: girOf(onNine), yards };
  };

  // A round can store its own putt and green totals, so they stand until a hole's putts or green changes.
  const puttsEdited = holes.some((hole, i) => hole.putts !== round.holes[i].putts);
  const girEdited = holes.some((hole, i) => hole.gir !== round.holes[i].gir);
  const scored = holes.filter((hole) => hole.strokes != null);
  const score = scored.length > 0 ? scored.reduce((sum, hole) => sum + hole.strokes!, 0) : null;
  const par = (course ? course.par ?? round.par : round.par) ?? sumIfAll(holes.map((hole) => hole.par));
  const scoreCounts = Object.fromEntries(SCORE_KINDS.map((kind) => [kind, 0])) as ScoreCounts;
  for (const hole of holes) if (hole.kind) scoreCounts[hole.kind] += 1;
  return {
    ...round,
    holes,
    frontNine: nine(FRONT_HOLES, round.frontNine, course?.front_nine_par, tee?.front_nine_yardage),
    backNine: nine(BACK_HOLES, round.backNine, course?.back_nine_par, tee?.back_nine_yardage),
    score,
    par,
    toPar: strokesToPar(score, par),
    putts: puttsEdited || round.putts == null ? puttsOf(holes) : round.putts,
    gir: girEdited || round.gir == null ? girOf(holes) : round.gir,
    yards: tee ? tee.total_yardage ?? sumIfAll(Object.values(tee.hole_yardages)) : yardsCleared ? null : round.yards,
    scoreCounts,
  };
}

const NO_NINE_FIGURES: NinesDto["front"] = { par: null, to_par: null, putts: null, gir: null, yards: null };

/**
 * A scanned card before it is saved. Nothing has been worked out by the server yet, so it is
 * read the way previewEdits reads an unsaved edit: against the course and tee the scan found.
 */
function fromScan(scan: ExtractedRound): Round {
  const holes: HoleScore[] = scan.hole_scores.map((score, i) => ({
    hole: score.hole_number ?? i + 1,
    par: null,
    handicap: null,
    yardage: null,
    strokes: score.strokes,
    putts: score.putts,
    gir: score.green_in_regulation,
    fairway: score.fairway_hit,
    shotsToGreen: score.shots_to_green,
    toPar: null,
    kind: null,
  }));
  const scanned = scan.course;
  const course: Course | null = scanned && {
    id: null,
    name: scanned.name,
    location: scanned.location,
    par: scanned.par,
    external_course_id: null,
    user_id: null,
    front_nine_par: null,
    back_nine_par: null,
    holes: scanned.holes,
    tees: scanned.tees.map((tee) => ({ ...tee, total_yardage: null, front_nine_yardage: null, back_nine_yardage: null })),
  };
  const unread: Round = {
    id: "",
    date: scan.date,
    course: scanned && { id: null, name: scanned.name, location: scanned.location, par: scanned.par },
    teeBox: scan.tee_box,
    holes,
    ...nines(holes, null, null, { front: NO_NINE_FIGURES, back: NO_NINE_FIGURES }),
    score: null,
    par: null,
    toPar: null,
    putts: null,
    gir: null,
    yards: null,
    scoreCounts: Object.fromEntries(SCORE_KINDS.map((kind) => [kind, 0])) as ScoreCounts,
  };
  return previewEdits(unread, {}, course, scan.tee_box);
}

export const Round = { fromSummary, fromDto, detailFromDto, fromScan, previewEdits };
