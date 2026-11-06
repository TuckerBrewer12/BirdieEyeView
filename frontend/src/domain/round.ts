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
import { BACK_HOLES, FRONT_HOLES, getHole, getTee } from "./course";
import { SCORE_KINDS, scoreKind, strokesToPar, type ScoreKind } from "./score";

export interface HoleSummary {
  hole: number;
  strokes: number | null;
  kind: ScoreKind | null;
}

export interface HoleScore extends HoleSummary {
  par: number | null;
  handicap: number | null;
  yardage: number | null;
  putts: number | null;
  gir: boolean | null;
  shotsToGreen: number | null;
  fairway: boolean | null;
  toPar: number | null;
  /** Three or more putts, as the server marks it. */
  threePutt: boolean;
}

export interface NineSummary {
  holes: HoleSummary[];
  total: number | null;
}

export interface Nine extends NineSummary {
  holes: HoleScore[];
  par: number | null;
  toPar: number | null;
  putts: number | null;
  gir: number | null;
  yards: number | null;
}

export interface RoundCourse {
  id: string | null;
  name: string | null;
  location: string | null;
  par: number | null;
}

export type ScoreCounts = ScoreCountsDto;

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
}

export interface Round extends RoundSummary {
  course: RoundCourse | null;
  holes: HoleScore[];
  frontNine: Nine;
  backNine: Nine;
  par: number | null;
  gir: number | null;
  yards: number | null;
  /** Holes with a score: what GIR is out of. */
  holesPlayed: number;
  /** The golfer's strokes off the tee played, from their own index. Null without ratings, and for a nine. */
  courseHandicap: number | null;
  netScore: number | null;
}

export type HoleEdits = Record<number, { strokes?: number | null; putts?: number | null; gir?: boolean | null }>;

export interface RoundDetail extends Round {
  linkedCourse: CourseDto | null;
  playedName: string | null;
}

export type CourseEdit =
  | { status: "linked"; course: CourseDto }
  | { status: "custom"; name: string }
  | { status: "picking" };

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
  return { hole: dto.hole_number, strokes: dto.strokes, kind: dto.kind };
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
  };
}

function detailFromDto(dto: RoundDto): RoundDetail {
  return { ...fromDto(dto), linkedCourse: dto.course, playedName: dto.course_name_played };
}

function nineTotal(holes: HoleScore[]): number | null {
  if (holes.length !== 9 || holes.some((hole) => hole.strokes == null)) return null;
  return holes.reduce((sum, hole) => sum + hole.strokes!, 0);
}

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

function previewEdits(round: Round, edits: HoleEdits, course?: CourseDto | null, teeBox?: string | null): Round {
  const tee = getTee(course, teeBox);
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

  const nine = (numbers: readonly number[], before: Nine, coursePar?: number | null, teeYards?: number | null): Nine => {
    const onNine = holes.filter((hole) => numbers.includes(hole.hole));
    const total = nineTotal(onNine);
    const par = (course ? coursePar : before.par) ?? sumIfAll(onNine.length === 9 ? onNine.map((hole) => hole.par) : []);
    const yards = tee
      ? teeYards ?? sumIfAll(onNine.length === 9 ? onNine.map((hole) => hole.yardage) : [])
      : yardsCleared ? null : before.yards;
    return { holes: onNine, total, par, toPar: strokesToPar(total, par), putts: puttsOf(onNine), gir: girOf(onNine), yards };
  };

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
    holes,
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
  };
}

const NO_NINE_FIGURES: NinesDto["front"] = { par: null, to_par: null, putts: null, gir: null, yards: null };

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
    holesPlayed: 0,
    courseHandicap: null,
    netScore: null,
  };
  return previewEdits(unread, {}, course, scan.tee_box);
}

export const Round = { fromSummary, fromDto, detailFromDto, fromScan, previewEdits };
