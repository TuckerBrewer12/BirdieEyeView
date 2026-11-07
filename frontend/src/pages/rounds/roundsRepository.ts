import { courseRepository, type CourseRepository } from "@/data/courseRepository";
import { roundRepository, type RoundRepository } from "@/data/roundRepository";
import {
  Round as RoundModel,
  editedHole,
  type RoundDetail,
  type RoundEdits,
  type RoundSummary,
} from "@/domain";
import { api } from "@/lib/api";
import type { RoundChangesDto, RoundComparisonDto } from "@/types/api";

/** What saving an edit sends: a course to link first, if one was picked, then the round's update. */
export interface UpdateRequest {
  linkCourseId: string | null;
  body: RoundChangesDto;
}

/** The shared round and course reads (`data/`), plus what only the rounds pages ask for. */
export interface RoundsRepository extends RoundRepository, CourseRepository {
  getRoundsForUser(userId: string, limit?: number): Promise<RoundSummary[]>;
  /** Saves an edit, linking a newly picked course first, and returns the round as saved. */
  saveRound(round: RoundDetail, edits: RoundEdits): Promise<RoundDetail>;
  deleteRound(roundId: string): Promise<void>;
  linkCourse(roundId: string, courseId: string): Promise<RoundSummary>;
  getRoundComparison(userId: string, roundId: string): Promise<RoundComparisonDto | null>;
}

/** The requests an edit makes. An edit left undefined keeps the hole's value; null clears it. */
export function updateRequestFrom(round: RoundDetail, edits: RoundEdits): UpdateRequest {
  const { course } = edits;
  const linkCourseId =
    course.status === "linked" && course.course.id && course.course.id !== round.linkedCourse?.id
      ? course.course.id
      : null;

  const holeScores = round.holes.map((hole) => {
    const { strokes, putts, gir } = editedHole(hole, edits.holes[hole.hole]);
    return { hole_number: hole.hole, strokes, putts, fairway_hit: hole.fairway, green_in_regulation: gir };
  });

  // A custom name is written; picking a course clears one the round had.
  let courseNamePlayed: string | null | undefined;
  if (course.status === "custom") courseNamePlayed = course.name;
  else if (round.playedName) courseNamePlayed = null;

  return {
    linkCourseId,
    body: {
      hole_scores: holeScores,
      tee_box: edits.teeBox || null,
      ...(courseNamePlayed !== undefined ? { course_name_played: courseNamePlayed } : {}),
    },
  };
}

export const roundsRepository: RoundsRepository = {
  ...roundRepository,
  ...courseRepository,
  getRoundsForUser: async (userId, limit = 100) =>
    (await api.getRoundsForUser(userId, limit)).map(RoundModel.fromSummary),
  saveRound: async (round, edits) => {
    const { linkCourseId, body } = updateRequestFrom(round, edits);
    if (linkCourseId) await api.linkCourse(round.id, linkCourseId);
    return RoundModel.detailFromDto(await api.updateRound(round.id, body));
  },
  deleteRound: (roundId) => api.deleteRound(roundId),
  linkCourse: async (roundId, courseId) => RoundModel.fromSummary(await api.linkCourse(roundId, courseId)),
  getRoundComparison: (userId, roundId) => api.getRoundComparison(userId, roundId),
};
