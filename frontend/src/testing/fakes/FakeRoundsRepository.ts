import { Round as RoundModel, type RoundDetail, type RoundEdits } from "../../domain";
import type { Course, CourseSummary } from "../../types/golf";
import type { RoundComparison } from "../../types/analytics";
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

  async getRoundsForUser(): Promise<RoundModel[]> {
    return this.store.getRoundsForUser().map(RoundModel.fromSummary);
  }

  async getRound(roundId: string): Promise<RoundDetail> {
    return RoundModel.detailFromDto(this.store.getRound(roundId));
  }

  /** Builds the same requests the real repository sends, and plays them against the store. */
  async saveRound(round: RoundDetail, edits: RoundEdits): Promise<RoundDetail> {
    const { linkCourseId, body } = updateRequestFrom(round, edits);
    if (linkCourseId) this.store.linkCourse(round.id, linkCourseId);
    return RoundModel.detailFromDto(this.store.updateRound(round.id, body));
  }

  async deleteRound(roundId: string): Promise<void> {
    this.store.deleteRound(roundId);
  }

  async linkCourse(roundId: string, courseId: string): Promise<RoundModel> {
    return RoundModel.fromSummary(this.store.linkCourse(roundId, courseId));
  }

  async getCourse(courseId: string): Promise<Course> {
    return this.store.getCourse(courseId);
  }

  async getRoundComparison(): Promise<RoundComparison | null> {
    return this.store.getRoundComparison();
  }

  async getUserHandicap(): Promise<{ handicap_index: number | null }> {
    return this.store.getUserHandicap();
  }

  async searchCourses(query: string): Promise<CourseSummary[]> {
    this.searchedQueries.push(query);
    const delay = this.store.nextSearchDelayMs();
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    return this.store.searchCourses(query);
  }
}
