import type {
  CourseDto,
  HoleScoreDto,
  HoleSummaryDto,
  NinesDto,
  RoundDto,
  RoundSummaryDto,
  ScannedRoundDto,
  ScoreCountsDto,
} from "@/types/api";
import { BACK_HOLES, FRONT_HOLES, formatCourseName, formatTeeName, getHole, getTee } from "./course";
import { formatDayShort } from "./date";
import { SCORE_KINDS, scoreKind, strokesToPar, type ScoreKind } from "./score";

/** One hole as a round list marks it: what was taken, how it scored, and where the round stood after it. */
export interface HoleSummary {
  hole: number;
  strokes: number | null;
  kind: ScoreKind | null;
  /** The round's to par after this hole, as the server ran it. Null for a hole it can't read. */
  runningToPar: number | null;
}

/** One hole as played. Par, handicap, yardage, to-par and kind come from the server. */
export interface HoleScore extends HoleSummary {
  par: number | null;
  /** The hole's stroke index. */
  handicap: number | null;
  /** From the tee played. */
  yardage: number | null;
  putts: number | null;
  gir: boolean | null;
  /** Strokes to reach the green, when the card recorded them. */
  shotsToGreen: number | null;
  fairway: boolean | null;
  toPar: number | null;
  /** Three or more putts, as the server marks it. */
  threePutt: boolean;
  /** The round's to par after this hole, as the server ran it. Null for a hole it can't read. */
  runningToPar: number | null;
}

/** The four holes in a row that lost the most to par, when they lost two or more. */
export interface WorstStretch {
  firstHole: number;
  lastHole: number;
  toPar: number;
}

/** The four holes in a row that lost the most to par, when they lost two or more. */
export interface WorstStretch {
  firstHole: number;
  lastHole: number;
  toPar: number;
}

export interface NineSummary {
  holes: HoleSummary[];
  /** Null until all nine holes are scored. */
  total: number | null;
}

export interface Nine extends NineSummary {
  holes: HoleScore[];
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

/** A round as lists show it: where and when, the figures a list reads, and each hole's mark. */
export interface RoundSummary {
  id: string;
  date: string | null;
  course: Pick<RoundCourse, "id" | "name"> | null;
  teeBox: string | null;
  holes: HoleSummary[];
  frontNine: NineSummary;
  backNine: NineSummary;
  score: number | null;
  toPar: number | null;
  putts: number | null;
  scoreCounts: ScoreCounts;
  /** Where the server places it in the Best order: full rounds by to par, then the rest. Null when unplaced. */
  bestRank: number | null;
  /** The same place worst first: full rounds furthest over par, then nines. */
  worstRank: number | null;
}

/** A round and its figures, as the server worked them out. */
export interface Round extends RoundSummary {
  course: RoundCourse | null;
  holes: HoleScore[];
  frontNine: Nine;
  backNine: Nine;
  par: number | null;
  gir: number | null;
  /** The tee played's length. */
  yards: number | null;
  /** Holes with a score: what GIR is out of. */
  holesPlayed: number;
  /** The golfer's strokes off the tee played, from their own index. Null without ratings, and for a nine. */
  courseHandicap: number | null;
  netScore: number | null;
  /** The server's worst stretch. Null when no four straight holes lost two. */
  worstStretch: WorstStretch | null;
}

/** Unsaved changes to holes. A field left undefined keeps the hole's own value. */
export type HoleEdits = Record<number, { strokes?: number | null; putts?: number | null; gir?: boolean | null }>;

/**
 * A round as the detail page and its editor read it: the round, plus the full course it is linked
 * to (holes and tees, for editing against) and the name it was played under. `course.name` shows
 * whichever applies; these keep the two apart.
 */
export interface RoundDetail extends Round {
  linkedCourse: CourseDto | null;
  /** The name the card was played under, when the round keeps its own name. */
  playedName: string | null;
}

/** Which course an edited round is saved against. */
export type CourseEdit =
  | { status: "linked"; course: CourseDto }
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
    threePutt: dto.three_putt,
    runningToPar: dto.running_to_par,
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

function holeSummary(dto: HoleSummaryDto): HoleSummary {
  return { hole: dto.hole_number, strokes: dto.strokes, kind: dto.kind, runningToPar: dto.running_to_par };
}

function fromSummary(dto: RoundSummaryDto): RoundSummary {
  const holes = dto.hole_scores.map(holeSummary);
  return {
    id: dto.id,
    date: dto.date,
    course: { id: dto.course_id, name: dto.course_name },
    teeBox: dto.tee_box,
    holes,
    frontNine: { holes: holes.filter((hole) => hole.hole <= 9), total: dto.front_nine },
    backNine: { holes: holes.filter((hole) => hole.hole >= 10), total: dto.back_nine },
    score: dto.total_score,
    toPar: dto.to_par,
    putts: dto.total_putts,
    scoreCounts: dto.score_counts,
    bestRank: dto.best_rank,
    worstRank: dto.worst_rank,
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
    holesPlayed: dto.holes_played,
    courseHandicap: dto.course_handicap,
    netScore: dto.net_score,
    bestRank: null,
    worstRank: null,
    worstStretch: dto.worst_stretch && {
      firstHole: dto.worst_stretch.first_hole,
      lastHole: dto.worst_stretch.last_hole,
      toPar: dto.worst_stretch.to_par,
    },
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
function previewEdits(round: Round, edits: HoleEdits, course?: CourseDto | null, teeBox?: string | null): Round {
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
      threePutt: putts != null && putts >= 3,
    };
  });
  // The round's flow (each hole's running to par, the worst stretch) is the server's alone. It
  // stands while every hole reads as it did, and an edit that moves one clears it until the save.
  const flowStands = holes.every((hole, i) => hole.toPar === round.holes[i].toPar);
  const flowHoles = flowStands ? holes : holes.map((hole) => ({ ...hole, runningToPar: null }));

  // A picked course and tee send their own nine pars and yardages.
  const nine = (numbers: readonly number[], before: Nine, coursePar?: number | null, teeYards?: number | null): Nine => {
    const onNine = flowHoles.filter((hole) => numbers.includes(hole.hole));
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
  // To par reads against the holes played, so a nine or a round cut short reads against its own holes.
  const fullRound = scored.length >= 18;
  const toPar = strokesToPar(score, sumIfAll(scored.map((hole) => hole.par)) ?? (fullRound ? par : null));
  // Tee ratings are for 18 holes. A picked tee sends the golfer's course handicap off it.
  const courseHandicap = !fullRound ? null : tee ? tee.course_handicap : yardsCleared ? null : round.courseHandicap;
  const scoreCounts = Object.fromEntries(SCORE_KINDS.map((kind) => [kind, 0])) as ScoreCounts;
  for (const hole of holes) if (hole.kind) scoreCounts[hole.kind] += 1;
  return {
    ...round,
    holes: flowHoles,
    frontNine: nine(FRONT_HOLES, round.frontNine, course?.front_nine_par, tee?.front_nine_yardage),
    backNine: nine(BACK_HOLES, round.backNine, course?.back_nine_par, tee?.back_nine_yardage),
    score,
    par,
    toPar,
    putts: puttsEdited || round.putts == null ? puttsOf(holes) : round.putts,
    gir: girEdited || round.gir == null ? girOf(holes) : round.gir,
    yards: tee ? tee.total_yardage ?? sumIfAll(Object.values(tee.hole_yardages)) : yardsCleared ? null : round.yards,
    scoreCounts,
    holesPlayed: scored.length,
    courseHandicap,
    netScore: courseHandicap != null && score != null ? score - courseHandicap : null,
    worstStretch: flowStands ? round.worstStretch : null,
  };
}

const NO_NINE_FIGURES: NinesDto["front"] = { par: null, to_par: null, putts: null, gir: null, yards: null };

/**
 * A scanned card before it is saved. Nothing has been worked out by the server yet, so it is
 * read the way previewEdits reads an unsaved edit: against the course and tee the scan found.
 */
function fromScan(scan: ScannedRoundDto): Round {
  const holes: HoleScore[] = scan.hole_scores.map((score) => ({
    hole: score.hole_number,
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
    threePutt: false,
    runningToPar: null,
  }));
  const scanned = scan.course;
  const course: CourseDto | null = scanned && {
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
    bestRank: null,
    worstRank: null,
    holesPlayed: 0,
    courseHandicap: null,
    netScore: null,
    worstStretch: null,
  };
  return previewEdits(unread, {}, course, scan.tee_box);
}

export const Round = { fromSummary, fromDto, detailFromDto, fromScan, previewEdits };

/**
 * A round on one line, as a sheet or a dialog names it: "Half Moon Bay · Jun 15 · 78". Each part
 * is left out when it is missing.
 */
export function roundLine(round: Pick<RoundSummary, "course" | "date" | "score">): string {
  const course = round.course?.name ? formatCourseName(round.course.name) : null;
  return [course, formatDayShort(round.date), round.score].filter((part) => part != null).join(" · ");
}

/** When and from where a round was played, under its course: "Oct 15 · Blue tees". Either part may be missing. */
export function roundDayAndTee(round: Pick<RoundSummary, "date" | "teeBox">): string | null {
  const parts = [formatDayShort(round.date), round.teeBox ? formatTeeName(round.teeBox) : null];
  const known = parts.filter((part) => part != null);
  return known.length > 0 ? known.join(" · ") : null;
}
