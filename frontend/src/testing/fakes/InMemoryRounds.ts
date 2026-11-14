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
import { courseSummaryResponse } from "./courseAnalyticsResponses";
import { listRanks, roundResponse, storedFromRound, summaryResponse, type StoredRound } from "./roundResponses";

export interface InMemoryRoundsSeed {
  rounds?: StoredRound[];
  courses?: CourseSummaryDto[];
  detailRounds?: RoundDto[];
  fullCourses?: CourseDto[];
  courseAnalytics?: CourseAnalyticsDto | null;
  comparison?: RoundComparisonDto | null;
  handicapIndex?: number | null;
  linkError?: string | null;
  updateError?: string | null;
  deleteError?: string | null;
  searchError?: string | null;
  saveError?: string | null;
  coursesError?: string | null;
  roundsError?: string | null;
  courseAnalyticsError?: string | null;
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

export class InMemoryRounds {
  private stored: Map<string, StoredRound>;
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
  savedScans: SaveScanRequestDto[] = [];
  coursesError: string | null;
  roundsError: string | null;
  courseAnalyticsError: string | null;
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
    this.roundsError = seed.roundsError ?? null;
    this.courseAnalyticsError = seed.courseAnalyticsError ?? null;
    this.searchDelaysMs = [...(seed.searchDelaysMs ?? [])];
    this.deletedIds = [];
  }

  nextSearchDelayMs(): number {
    return this.searchDelaysMs[this.searchCalls++] ?? 0;
  }

  private withRecord(course: CourseSummaryDto): CourseSummaryDto {
    return courseSummaryResponse(course, [...this.stored.values()]);
  }

  searchCourses(query: string, includeRecord = false): CourseSummaryDto[] {
    if (this.searchError) throw new Error(this.searchError);
    const q = query.toLowerCase();
    const byId = new Map<string, CourseSummaryDto>();
    for (const course of this.fullCourses) {
      if (course.id) byId.set(course.id, toCourseSummary(course));
    }
    for (const course of this.courses) {
      byId.set(course.id, course);
    }
    return [...byId.values()]
      .filter((course) => (course.name ?? "").toLowerCase().includes(q))
      .map((course) =>
        includeRecord ? this.withRecord(course) : { ...course, rounds_played: 0, scoring_average: null, best_score: null },
      );
  }

  getCourses(): CourseSummaryDto[] {
    if (this.coursesError) throw new Error(this.coursesError);
    return this.courses.map((course) => this.withRecord(course));
  }

  getRoundsForUser(): RoundSummaryDto[] {
    const rounds = this.listed.map((id) => this.stored.get(id)!);
    const ranks = listRanks(rounds);
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
