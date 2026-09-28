import type { Course, CourseSummary } from "../../types/golf";
import type { CourseDto, RoundDto, RoundSummaryDto } from "../../types/api";
import type { CourseAnalyticsData, RoundComparison } from "../../types/analytics";
import type { UpdateRoundBody } from "../../pages/rounds/roundsRepository";
import { emptyCourseAnalytics } from "../fixtures/courseAnalytics";
import { toCourseSummary } from "../fixtures/roundDetails";
import {
  roundResponse,
  storedFromRound,
  storedFromSummary,
  summaryResponse,
  type StoredRound,
} from "./roundResponses";

export interface InMemoryRoundsSeed {
  /** The round list, in order. */
  rounds?: RoundSummaryDto[];
  courses?: CourseSummary[];
  /** Full rounds; one sharing an id with a listed round replaces its facts. */
  detailRounds?: RoundDto[];
  fullCourses?: Course[];
  courseAnalytics?: CourseAnalyticsData | null;
  comparison?: RoundComparison | null;
  handicapIndex?: number | null;
  linkError?: string | null;
  updateError?: string | null;
  deleteError?: string | null;
  searchError?: string | null;
  coursesError?: string | null;
  searchDelaysMs?: number[];
}

function applyUpdate(round: StoredRound, body: UpdateRoundBody): StoredRound {
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

/** One in-memory golf store. FakeRoundsRepository and FakeBackend both use this. */
export class InMemoryRounds {
  /** Round facts by id; every response is built from these, the way the server builds it. */
  private stored: Map<string, StoredRound>;
  /** Ids of the rounds the list returns, in order. */
  private listed: string[];
  courses: CourseSummary[];
  fullCourses: Course[];
  courseAnalytics: CourseAnalyticsData | null;
  comparison: RoundComparison | null;
  handicapIndex: number | null;
  linkError: string | null;
  updateError: string | null;
  deleteError: string | null;
  searchError: string | null;
  coursesError: string | null;
  searchDelaysMs: number[];
  private searchCalls = 0;
  deletedIds: string[];

  constructor(seed: InMemoryRoundsSeed = {}) {
    const rounds = seed.rounds ?? [];
    this.stored = new Map(rounds.map((round) => [round.id, storedFromSummary(round)]));
    for (const round of seed.detailRounds ?? []) {
      if (round.id) this.stored.set(round.id, storedFromRound(round));
    }
    this.listed = rounds.map((round) => round.id);
    this.courses = [...(seed.courses ?? [])];
    this.fullCourses = [...(seed.fullCourses ?? [])];
    this.courseAnalytics = seed.courseAnalytics ?? null;
    this.comparison = seed.comparison ?? null;
    this.handicapIndex = seed.handicapIndex ?? null;
    this.linkError = seed.linkError ?? null;
    this.updateError = seed.updateError ?? null;
    this.deleteError = seed.deleteError ?? null;
    this.searchError = seed.searchError ?? null;
    this.coursesError = seed.coursesError ?? null;
    this.searchDelaysMs = [...(seed.searchDelaysMs ?? [])];
    this.deletedIds = [];
  }

  nextSearchDelayMs(): number {
    return this.searchDelaysMs[this.searchCalls++] ?? 0;
  }

  searchCourses(query: string): CourseSummary[] {
    if (this.searchError) throw new Error(this.searchError);
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

  getCourses(): CourseSummary[] {
    if (this.coursesError) throw new Error(this.coursesError);
    return this.courses;
  }

  getRoundsForUser(): RoundSummaryDto[] {
    return this.listed.map((id) => summaryResponse(this.stored.get(id)!));
  }

  private find(roundId: string): StoredRound {
    const round = this.stored.get(roundId);
    if (!round) throw new Error("Round not found.");
    return round;
  }

  getRound(roundId: string): RoundDto {
    return roundResponse(this.find(roundId));
  }

  updateRound(roundId: string, body: UpdateRoundBody): RoundDto {
    if (this.updateError) throw new Error(this.updateError);
    const updated = applyUpdate(this.find(roundId), body);
    this.stored.set(roundId, updated);
    return roundResponse(updated);
  }

  deleteRound(roundId: string): void {
    if (this.deleteError) throw new Error(this.deleteError);
    this.deletedIds = [...this.deletedIds, roundId];
    this.stored.delete(roundId);
    this.listed = this.listed.filter((id) => id !== roundId);
  }

  linkCourse(roundId: string, courseId: string): RoundSummaryDto {
    if (this.linkError) throw new Error(this.linkError);
    const round = this.find(roundId);
    const course: CourseDto = this.getCourse(courseId);
    const linked = { ...round, course, course_name_played: null };
    this.stored.set(roundId, linked);
    return summaryResponse(linked);
  }

  getCourse(courseId: string): CourseDto {
    const course = this.fullCourses.find((c) => c.id === courseId);
    if (course) return { external_course_id: null, user_id: null, ...course };
    const summary = this.courses.find((c) => c.id === courseId);
    if (summary) {
      return {
        id: summary.id,
        name: summary.name,
        location: summary.location,
        par: summary.par,
        holes: [],
        tees: [],
        external_course_id: null,
        user_id: null,
      };
    }
    throw new Error("Course not found.");
  }

  getCourseAnalytics(courseId: string): CourseAnalyticsData {
    return this.courseAnalytics ?? emptyCourseAnalytics(courseId);
  }

  getRoundComparison(): RoundComparison | null {
    return this.comparison;
  }

  getUserHandicap(): { handicap_index: number | null } {
    return { handicap_index: this.handicapIndex };
  }
}
