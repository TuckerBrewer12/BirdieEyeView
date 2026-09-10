import type { CourseSummary, RoundSummary } from "../../types/golf";
import type { RoundsRepository } from "../../pages/rounds/roundsRepository";

export interface FakeRoundsRepositorySeed {
  rounds?: RoundSummary[];
  courses?: CourseSummary[];
  linkError?: string | null;
}

export class FakeRoundsRepository implements RoundsRepository {
  rounds: RoundSummary[];
  courses: CourseSummary[];
  linkError: string | null;

  constructor(seed: FakeRoundsRepositorySeed = {}) {
    this.rounds = (seed.rounds ?? []).map((round) => ({ ...round }));
    this.courses = [...(seed.courses ?? [])];
    this.linkError = seed.linkError ?? null;
  }

  async getRoundsForUser(): Promise<RoundSummary[]> {
    return this.rounds;
  }

  async linkCourse(roundId: string, courseId: string): Promise<RoundSummary> {
    if (this.linkError) throw new Error(this.linkError);
    const course = this.courses.find((c) => c.id === courseId);
    this.rounds = this.rounds.map((round) =>
      round.id === roundId
        ? {
            ...round,
            course_id: courseId,
            course_name: course?.name ?? round.course_name,
            course_location: course?.location ?? round.course_location,
          }
        : round,
    );
    const updated = this.rounds.find((round) => round.id === roundId);
    if (!updated) throw new Error("Round not found.");
    return updated;
  }
}
