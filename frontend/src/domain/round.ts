import type { Course as CourseDto, Round as RoundDto, RoundSummary } from "@/types/golf";
import { coursePar, getHole } from "./course";
import { netScore } from "./handicap";
import { scoreKind, strokesToPar, type ScoreKind } from "./score";

export interface HoleScoreFacts {
  hole: number;
  par: number | null;
  strokes: number | null;
  putts?: number | null;
  gir?: boolean | null;
  fairway?: boolean | null;
}

/** One hole as it was played. Par is resolved when the round is built: the course's hole, else par_played. */
export class HoleScore {
  readonly hole: number;
  readonly par: number | null;
  readonly strokes: number | null;
  readonly putts: number | null;
  readonly gir: boolean | null;
  readonly fairway: boolean | null;

  constructor(facts: HoleScoreFacts) {
    this.hole = facts.hole;
    this.par = facts.par;
    this.strokes = facts.strokes;
    this.putts = facts.putts ?? null;
    this.gir = facts.gir ?? null;
    this.fairway = facts.fairway ?? null;
  }

  get toPar(): number | null {
    return strokesToPar(this.strokes, this.par);
  }

  get kind(): ScoreKind | null {
    return scoreKind(this.strokes, this.par);
  }
}

/** Nine holes of a round, in hole order. */
export class Nine {
  readonly holes: HoleScore[];

  constructor(holes: HoleScore[]) {
    this.holes = holes;
  }

  /** Strokes over the nine, once all nine holes are scored. */
  get total(): number | null {
    if (this.holes.length !== 9 || this.holes.some((hole) => hole.strokes == null)) return null;
    return this.holes.reduce((sum, hole) => sum + hole.strokes!, 0);
  }
}

/** Where a round was played. A round not linked to a course keeps the card's name and no id. */
export interface RoundCourse {
  id: string | null;
  name: string | null;
  location: string | null;
  par: number | null;
}

export interface RoundFacts {
  id: string;
  date: string | null;
  course: RoundCourse | null;
  teeBox: string | null;
  holes: HoleScore[];
  /** Stored totals, for cards that recorded them without per-hole detail. */
  totalPutts?: number | null;
  totalGir?: number | null;
}

export type StrokeOverrides = Record<number, { strokes: number | null }>;

/**
 * A round: when and where it was played, and its hole scores in hole order.
 * Only those facts are stored; score, nines, par and to-par are read from the holes.
 */
export class Round {
  readonly id: string;
  readonly date: string | null;
  readonly course: RoundCourse | null;
  readonly teeBox: string | null;
  readonly holes: HoleScore[];
  readonly totalPutts: number | null;
  readonly totalGir: number | null;

  constructor(facts: RoundFacts) {
    this.id = facts.id;
    this.date = facts.date;
    this.course = facts.course;
    this.teeBox = facts.teeBox;
    this.holes = [...facts.holes].sort((a, b) => a.hole - b.hole);
    this.totalPutts = facts.totalPutts ?? null;
    this.totalGir = facts.totalGir ?? null;
  }

  static fromSummary(summary: RoundSummary): Round {
    return new Round({
      id: summary.id,
      date: summary.date,
      course: {
        id: summary.course_id,
        name: summary.course_name,
        location: summary.course_location,
        par: summary.course_par,
      },
      teeBox: summary.tee_box,
      holes: (summary.hole_scores_summary ?? []).map(
        (hole) => new HoleScore({ hole: hole.h, par: hole.p, strokes: hole.s }),
      ),
      totalPutts: summary.total_putts,
      totalGir: summary.total_gir,
    });
  }

  /** Pass `course` to read the round against a course other than the one it is linked to. */
  static fromDto(dto: RoundDto, course: CourseDto | null = dto.course): Round {
    return new Round({
      id: dto.id ?? "",
      date: dto.date,
      course: {
        id: course?.id ?? null,
        name: dto.course_name_played ?? course?.name ?? null,
        location: course?.location ?? null,
        par: coursePar(course),
      },
      teeBox: dto.tee_box,
      holes: dto.hole_scores
        .filter((score) => score.hole_number != null)
        .map(
          (score) =>
            new HoleScore({
              hole: score.hole_number!,
              par: getHole(course, score.hole_number!)?.par ?? score.par_played,
              strokes: score.strokes,
              putts: score.putts,
              gir: score.green_in_regulation,
              fairway: score.fairway_hit,
            }),
        ),
      totalPutts: dto.total_putts,
      totalGir: dto.total_gir,
    });
  }

  /** Strokes over the scored holes. Null when none are scored. */
  get score(): number | null {
    const scored = this.scoredHoles;
    return scored.length > 0 ? scored.reduce((sum, hole) => sum + hole.strokes!, 0) : null;
  }

  /** Course par, or the sum of the hole pars when the round has no course par. */
  get par(): number | null {
    if (this.course?.par != null) return this.course.par;
    const pars = this.holes.map((hole) => hole.par).filter((par): par is number => par != null);
    return pars.length > 0 ? pars.reduce((sum, par) => sum + par, 0) : null;
  }

  get toPar(): number | null {
    return strokesToPar(this.score, this.par);
  }

  get frontNine(): Nine {
    return new Nine(this.holes.filter((hole) => hole.hole <= 9));
  }

  get backNine(): Nine {
    return new Nine(this.holes.filter((hole) => hole.hole >= 10));
  }

  get scoredHoles(): HoleScore[] {
    return this.holes.filter((hole) => hole.strokes != null);
  }

  /** The stored total, else the holes' putts once every scored hole has them. */
  get putts(): number | null {
    if (this.totalPutts != null) return this.totalPutts;
    const scored = this.scoredHoles;
    if (scored.length === 0 || scored.some((hole) => hole.putts == null)) return null;
    return scored.reduce((sum, hole) => sum + hole.putts!, 0);
  }

  /** The stored total, else the greens hit across the holes that recorded it. */
  get gir(): number | null {
    if (this.totalGir != null) return this.totalGir;
    const recorded = this.holes.filter((hole) => hole.gir != null);
    return recorded.length > 0 ? recorded.filter((hole) => hole.gir).length : null;
  }

  netScore(courseHandicap: number): number | null {
    return this.score != null ? netScore(this.score, courseHandicap) : null;
  }

  /** How many holes landed in each score bucket. Holes that cannot be classified are left out. */
  get kindCounts(): Partial<Record<ScoreKind, number>> {
    const counts: Partial<Record<ScoreKind, number>> = {};
    for (const hole of this.holes) {
      const kind = hole.kind;
      if (kind) counts[kind] = (counts[kind] ?? 0) + 1;
    }
    return counts;
  }

  withStrokes(edited: StrokeOverrides): Round {
    return new Round({
      ...this,
      holes: this.holes.map((hole) =>
        hole.hole in edited ? new HoleScore({ ...hole, strokes: edited[hole.hole].strokes }) : hole,
      ),
    });
  }
}
