import type { HoleScoreDto, RoundDto, RoundSummaryDto, ScoreCountsDto } from "@/types/api";
import type { Course } from "@/types/golf";
import { getHole } from "./course";
import { SCORE_KINDS, scoreKind, strokesToPar, type ScoreKind } from "./score";

/** One hole as played. Par, to-par and kind come from the server. */
export interface HoleScore {
  hole: number;
  par: number | null;
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
  scoreCounts: ScoreCounts;
}

export type StrokeOverrides = Record<number, { strokes: number | null }>;

function holeScore(dto: HoleScoreDto): HoleScore {
  return {
    hole: dto.hole_number,
    par: dto.par,
    strokes: dto.strokes,
    putts: dto.putts,
    gir: dto.green_in_regulation,
    fairway: dto.fairway_hit,
    toPar: dto.to_par,
    kind: dto.kind,
  };
}

function nines(holes: HoleScore[], front: number | null, back: number | null): Pick<Round, "frontNine" | "backNine"> {
  return {
    frontNine: { holes: holes.filter((hole) => hole.hole <= 9), total: front },
    backNine: { holes: holes.filter((hole) => hole.hole >= 10), total: back },
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
    ...nines(holes, dto.front_nine, dto.back_nine),
    score: dto.total_score,
    par: dto.par,
    toPar: dto.to_par,
    putts: dto.total_putts,
    gir: dto.total_gir,
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
    ...nines(holes, dto.front_nine, dto.back_nine),
    score: dto.total_score,
    par: dto.par,
    toPar: dto.to_par,
    putts: dto.total_putts,
    gir: dto.total_gir,
    scoreCounts: dto.score_counts,
  };
}

function nineTotal(holes: HoleScore[]): number | null {
  if (holes.length !== 9 || holes.some((hole) => hole.strokes == null)) return null;
  return holes.reduce((sum, hole) => sum + hole.strokes!, 0);
}

/**
 * The round as it would read with unsaved edits: new strokes, or a different course's pars.
 * This is the one place the frontend works out golf figures, and only until the edit is saved;
 * it follows the server's rules (models/round.py) and the saved response replaces it.
 */
function previewEdits(round: Round, edits: StrokeOverrides, course?: Course | null): Round {
  const holes = round.holes.map((hole) => {
    const strokes = hole.hole in edits ? edits[hole.hole].strokes : hole.strokes;
    const par = getHole(course, hole.hole)?.par ?? hole.par;
    return { ...hole, strokes, par, toPar: strokesToPar(strokes, par), kind: scoreKind(strokes, par) };
  });
  const scored = holes.filter((hole) => hole.strokes != null);
  const score = scored.length > 0 ? scored.reduce((sum, hole) => sum + hole.strokes!, 0) : null;
  const par = course ? course.par ?? round.par : round.par;
  const scoreCounts = Object.fromEntries(SCORE_KINDS.map((kind) => [kind, 0])) as ScoreCounts;
  for (const hole of holes) if (hole.kind) scoreCounts[hole.kind] += 1;
  const front = holes.filter((hole) => hole.hole <= 9);
  const back = holes.filter((hole) => hole.hole >= 10);
  return {
    ...round,
    holes,
    ...nines(holes, nineTotal(front), nineTotal(back)),
    score,
    par,
    toPar: strokesToPar(score, par),
    scoreCounts,
  };
}

export const Round = { fromSummary, fromDto, previewEdits };
