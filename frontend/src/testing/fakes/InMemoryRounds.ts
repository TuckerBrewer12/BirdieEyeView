import type { Course, CourseSummary, Round, RoundSummary } from "../../types/golf";
import type { RoundComparison } from "../../types/analytics";
import type { UpdateRoundBody } from "../../pages/rounds/roundsRepository";
import { roundFromSummary, toCourseSummary } from "../fixtures/roundDetails";

export interface InMemoryRoundsSeed {
  rounds?: RoundSummary[];
  courses?: CourseSummary[];
  detailRounds?: Round[];
  fullCourses?: Course[];
  comparison?: RoundComparison | null;
  handicapIndex?: number | null;
  linkError?: string | null;
  updateError?: string | null;
  deleteError?: string | null;
}

function applyUpdate(round: Round, body: UpdateRoundBody): Round {
  const scores = body.hole_scores
    ? round.hole_scores.map((score) => {
        const edited = body.hole_scores?.find((h) => h.hole_number === score.hole_number);
        if (!edited) return score;
        return {
          ...score,
          strokes: edited.strokes !== undefined ? edited.strokes : score.strokes,
          putts: edited.putts !== undefined ? edited.putts : score.putts,
          fairway_hit: edited.fairway_hit !== undefined ? edited.fairway_hit : score.fairway_hit,
          green_in_regulation:
            edited.green_in_regulation !== undefined
              ? edited.green_in_regulation
              : score.green_in_regulation,
        };
      })
    : round.hole_scores;
  return {
    ...round,
    hole_scores: scores,
    tee_box: body.tee_box !== undefined ? body.tee_box : round.tee_box,
    notes: body.notes !== undefined ? body.notes : round.notes,
    weather_conditions:
      body.weather_conditions !== undefined ? body.weather_conditions : round.weather_conditions,
    course_name_played:
      body.course_name_played !== undefined ? body.course_name_played : round.course_name_played,
  };
}

function summaryFromLink(
  roundId: string,
  courseId: string,
  detail: Round,
  name: string | null,
  location: string | null,
  par: number | null,
): RoundSummary {
  return {
    id: roundId,
    course_id: courseId,
    course_name: name,
    course_location: location,
    course_par: par,
    tee_box: detail.tee_box,
    date: detail.date,
    total_score: null,
    to_par: null,
    front_nine: null,
    back_nine: null,
    total_putts: detail.total_putts,
    total_gir: detail.total_gir,
    fairways_hit: null,
    notes: detail.notes,
  };
}

/** One in-memory golf store. FakeRoundsRepository and FakeBackend both use this. */
export class InMemoryRounds {
  rounds: RoundSummary[];
  courses: CourseSummary[];
  detailRounds: Round[];
  fullCourses: Course[];
  comparison: RoundComparison | null;
  handicapIndex: number | null;
  linkError: string | null;
  updateError: string | null;
  deleteError: string | null;
  deletedIds: string[];

  constructor(seed: InMemoryRoundsSeed = {}) {
    this.rounds = (seed.rounds ?? []).map((round) => ({ ...round }));
    this.courses = [...(seed.courses ?? [])];
    this.detailRounds = (seed.detailRounds ?? []).map((round) => ({
      ...round,
      hole_scores: round.hole_scores.map((score) => ({ ...score })),
    }));
    this.fullCourses = [...(seed.fullCourses ?? [])];
    this.comparison = seed.comparison ?? null;
    this.handicapIndex = seed.handicapIndex ?? null;
    this.linkError = seed.linkError ?? null;
    this.updateError = seed.updateError ?? null;
    this.deleteError = seed.deleteError ?? null;
    this.deletedIds = [];
  }

  searchCourses(query: string): CourseSummary[] {
    const q = query.toLowerCase();
    const byId = new Map<string, CourseSummary>();
    for (const course of this.fullCourses) {
      if (course.id) byId.set(course.id, toCourseSummary(course));
    }
    for (const course of this.courses) {
      byId.set(course.id, course);
    }
    return [...byId.values()].filter((course) => (course.name ?? "").toLowerCase().includes(q));
  }

  getRoundsForUser(): RoundSummary[] {
    return this.rounds;
  }

  getRound(roundId: string): Round {
    const detail = this.detailRounds.find((round) => round.id === roundId);
    if (detail) return detail;
    const summary = this.rounds.find((round) => round.id === roundId);
    if (summary) return roundFromSummary(summary);
    throw new Error("Round not found.");
  }

  updateRound(roundId: string, body: UpdateRoundBody): Round {
    if (this.updateError) throw new Error(this.updateError);
    const index = this.detailRounds.findIndex((round) => round.id === roundId);
    if (index === -1) {
      const summary = this.rounds.find((round) => round.id === roundId);
      if (!summary) throw new Error("Round not found.");
      const created = applyUpdate(roundFromSummary(summary), body);
      this.detailRounds = [...this.detailRounds, created];
      return created;
    }
    const updated = applyUpdate(this.detailRounds[index], body);
    this.detailRounds = this.detailRounds.map((round, i) => (i === index ? updated : round));
    return updated;
  }

  deleteRound(roundId: string): void {
    if (this.deleteError) throw new Error(this.deleteError);
    this.deletedIds = [...this.deletedIds, roundId];
    this.rounds = this.rounds.filter((round) => round.id !== roundId);
    this.detailRounds = this.detailRounds.filter((round) => round.id !== roundId);
  }

  linkCourse(roundId: string, courseId: string): RoundSummary {
    if (this.linkError) throw new Error(this.linkError);
    const course = this.courses.find((c) => c.id === courseId);
    const full = this.fullCourses.find((c) => c.id === courseId);
    const name = course?.name ?? full?.name ?? null;
    const location = course?.location ?? full?.location ?? null;
    this.rounds = this.rounds.map((round) =>
      round.id === roundId
        ? {
            ...round,
            course_id: courseId,
            course_name: name ?? round.course_name,
            course_location: location ?? round.course_location,
          }
        : round,
    );
    this.detailRounds = this.detailRounds.map((round) =>
      round.id === roundId ? { ...round, course: full ?? round.course } : round,
    );
    const updated = this.rounds.find((round) => round.id === roundId);
    if (updated) return updated;
    const detail = this.detailRounds.find((round) => round.id === roundId);
    if (!detail) throw new Error("Round not found.");
    return summaryFromLink(roundId, courseId, detail, name, location, full?.par ?? null);
  }

  getCourse(courseId: string): Course {
    const course = this.fullCourses.find((c) => c.id === courseId);
    if (!course) throw new Error("Course not found.");
    return course;
  }

  getRoundComparison(): RoundComparison | null {
    return this.comparison;
  }

  getUserHandicap(): { handicap_index: number | null } {
    return { handicap_index: this.handicapIndex };
  }
}
