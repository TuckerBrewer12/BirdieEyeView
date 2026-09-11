import type { Course, Round, RoundSummary } from "../../types/golf";
import type { RoundComparison } from "../../types/analytics";
import type { RoundsRepository, UpdateRoundBody } from "../../pages/rounds/roundsRepository";
import { InMemoryRounds, type InMemoryRoundsSeed } from "./InMemoryRounds";

export type FakeRoundsRepositorySeed = InMemoryRoundsSeed;

export class FakeRoundsRepository implements RoundsRepository {
  readonly store: InMemoryRounds;

  constructor(seed: FakeRoundsRepositorySeed = {}) {
    this.store = new InMemoryRounds(seed);
  }

  get deletedIds(): string[] {
    return this.store.deletedIds;
  }

  async getRoundsForUser(): Promise<RoundSummary[]> {
    return this.store.getRoundsForUser();
  }

  async getRound(roundId: string): Promise<Round> {
    return this.store.getRound(roundId);
  }

  async updateRound(roundId: string, body: UpdateRoundBody): Promise<Round> {
    return this.store.updateRound(roundId, body);
  }

  async deleteRound(roundId: string): Promise<void> {
    this.store.deleteRound(roundId);
  }

  async linkCourse(roundId: string, courseId: string): Promise<RoundSummary> {
    return this.store.linkCourse(roundId, courseId);
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
}
