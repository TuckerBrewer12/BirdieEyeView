import type {
  CourseAnalyticsDto,
  CourseDto,
  CourseSummaryDto,
  RoundComparisonDto,
  RoundDto,
  RoundSummaryDto,
  SaveScanRequestDto,
} from "../../types/api";
import type { UpdateRoundBody } from "../../pages/rounds/roundsRepository";
import { emptyCourseAnalytics } from "../fixtures/courseAnalytics";
import { toCourseSummary } from "../fixtures/roundDetails";
import { courseResponse } from "./courseResponses";
import { bestRanks, roundResponse, storedFromRound, summaryResponse, type StoredRound } from "./roundResponses";

export interface InMemoryRoundsSeed {
  /** The round list, in order, as the facts the server stores. */
  rounds?: StoredRound[];
  courses?: CourseSummaryDto[];
  /** Full rounds; one sharing an id with a listed round replaces its facts. */
  detailRounds?: RoundDto[];
  fullCourses?: CourseDto[];
  courseAnalytics?: CourseAnalyticsDto | null;
  comparison?: RoundComparisonDto | null;
  /** The handicap on the golfer's profile. Course handicaps come on the courses' tees, as the server sends them. */
  handicapIndex?: number | null;
  linkError?: string | null;
  updateError?: string | null;
  deleteError?: string | null;
  searchError?: string | null;
  /** Saving a scan fails with this. */
  saveError?: string | null;
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
  courses: CourseSummaryDto[];
  fullCourses: CourseDto[];
  courseAnalytics: CourseAnalyticsDto | null;
  comparison: RoundComparisonDto | null;
  handicapIndex: number | null;
  linkError: string | null;
  updateError: string | null;
  deleteError: string | null;
  searchError: string | null;
  saveError: string | null;
  /** Every scan saved, as sent. */
  savedScans: SaveScanRequestDto[] = [];
  coursesError: string | null;
  searchDelaysMs: number[];
  private searchCalls = 0;
  deletedIds: string[];

  constructor(seed: InMemoryRoundsSeed = {}) {
    const rounds = seed.rounds ?? [];
    this.stored = new Map(rounds.map((round) => [round.id, round]));
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
    this.saveError = seed.saveError ?? null;
    this.coursesError = seed.coursesError ?? null;
    this.searchDelaysMs = [...(seed.searchDelaysMs ?? [])];
    this.deletedIds = [];
  }

  nextSearchDelayMs(): number {
    return this.searchDelaysMs[this.searchCalls++] ?? 0;
  }

  searchCourses(query: string): CourseSummaryDto[] {
    if (this.searchError) throw new Error(this.searchError);
    const q = query.toLowerCase();
    const byId = new Map<string, CourseSummaryDto>();
    for (const course of this.fullCourses) {
      if (course.id) byId.set(course.id, toCourseSummary(course));
    }
    for (const course of this.courses) {
      byId.set(course.id, course);
    }
    return [...byId.values()].filter((course) => (course.name ?? "").toLowerCase().includes(q));
  }

  getCourses(): CourseSummaryDto[] {
    if (this.coursesError) throw new Error(this.coursesError);
    return this.courses;
  }

  getRoundsForUser(): RoundSummaryDto[] {
    const rounds = this.listed.map((id) => this.stored.get(id)!);
    const ranks = bestRanks(rounds);
    return rounds.map((round, i) => summaryResponse(round, ranks[i]));
  }

  private find(roundId: string): StoredRound {
    const round = this.stored.get(roundId);
    if (!round) throw new Error("Round not found.");
    return round;
  }

  getRound(roundId: string): RoundDto {
    return roundResponse(this.find(roundId));
  }

  /**
   * Saves a checked scan as a new round at the top of the list, the way `/api/scan/save`
   * does: linked to the course when one was picked, else under the name read off the card.
   */
  saveScan(body: SaveScanRequestDto): string {
    if (this.saveError) throw new Error(this.saveError);
    const id = `scanned-${this.stored.size + 1}`;
    const linked = body.course_id
      ? this.fullCourses.find((course) => course.id === body.course_id) ?? null
      : null;
    const parFor = (hole: number) => body.course_holes?.find((h) => h.hole_number === hole);
    this.stored.set(id, {
      id,
      course: linked,
      tee_box: body.tee_box ?? null,
      date: body.date ?? null,
      hole_scores: body.hole_scores.map((score) => ({
        hole_number: score.hole_number,
        strokes: score.strokes ?? null,
        putts: score.putts ?? null,
        fairway_hit: score.fairway_hit ?? null,
        green_in_regulation: score.green_in_regulation ?? null,
        par_played: parFor(score.hole_number)?.par ?? null,
        handicap_played: parFor(score.hole_number)?.handicap ?? null,
      })),
      notes: body.notes ?? null,
      weather_conditions: null,
      course_name_played: linked ? null : (body.course_name ?? null),
      user_tee: null,
    });
    this.listed = [id, ...this.listed];
    this.savedScans = [...this.savedScans, body];
    return id;
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
    if (course) return course;
    const summary = this.courses.find((c) => c.id === courseId);
    if (summary) {
      return courseResponse({
        id: summary.id,
        name: summary.name,
        location: summary.location,
        par: summary.par,
        holes: [],
        tees: [],
      });
    }
    throw new Error("Course not found.");
  }

  getCourseAnalytics(courseId: string): CourseAnalyticsDto {
    return this.courseAnalytics ?? emptyCourseAnalytics(courseId);
  }

  getRoundComparison(): RoundComparisonDto | null {
    return this.comparison;
  }
}
