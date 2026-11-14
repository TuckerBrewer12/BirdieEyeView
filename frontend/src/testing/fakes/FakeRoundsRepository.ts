import {
  Round as RoundModel,
  courseSummaryFrom,
  type CourseSummary,
  type RoundDetail,
  type RoundEdits,
  type RoundSummary,
} from "../../domain";
import type { CourseDto, RoundComparisonDto } from "../../types/api";
import { updateRequestFrom, type RoundsRepository } from "../../pages/rounds/roundsRepository";
import { InMemoryRounds, type InMemoryRoundsSeed } from "./InMemoryRounds";

export type FakeRoundsRepositorySeed = InMemoryRoundsSeed;

export class FakeRoundsRepository implements RoundsRepository {
  readonly store: InMemoryRounds;
  readonly searchedQueries: string[] = [];

  constructor(seed: FakeRoundsRepositorySeed = {}) {
    this.store = new InMemoryRounds(seed);
  }

  get deletedIds(): string[] {
    return this.store.deletedIds;
  }

  async getRoundsForUser(): Promise<RoundSummary[]> {
    if (this.store.roundsError) throw new Error(this.store.roundsError);
    return this.store.getRoundsForUser().map(RoundModel.fromSummary);
  }

  async getRound(roundId: string): Promise<RoundDetail> {
    return RoundModel.detailFromDto(this.store.getRound(roundId));
  }

  async saveRound(round: RoundDetail, edits: RoundEdits): Promise<RoundDetail> {
    const { linkCourseId, body } = updateRequestFrom(round, edits);
    if (linkCourseId) this.store.linkCourse(round.id, linkCourseId);
    return RoundModel.detailFromDto(this.store.updateRound(round.id, body));
  }

  async deleteRound(roundId: string): Promise<void> {
    this.store.deleteRound(roundId);
  }

  async linkCourse(roundId: string, courseId: string): Promise<RoundSummary> {
    return RoundModel.fromSummary(this.store.linkCourse(roundId, courseId));
  }

  async getCourse(courseId: string): Promise<CourseDto> {
    return this.store.getCourse(courseId);
  }

  async getRoundComparison(): Promise<RoundComparisonDto | null> {
    return this.store.getRoundComparison();
  }

  async searchCourses(query: string): Promise<CourseSummary[]> {
    this.searchedQueries.push(query);
    const delay = this.store.nextSearchDelayMs();
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    return this.store.searchCourses(query).map(courseSummaryFrom);
  }
}
