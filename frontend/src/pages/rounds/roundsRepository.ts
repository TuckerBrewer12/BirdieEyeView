import { userRepository } from "@/data/userRepository";
import { Round as RoundModel, type RoundDetail, type RoundEdits } from "@/domain";
import { api } from "@/lib/api";
import type { Course, CourseSummary } from "@/types/golf";
import type { RoundComparison } from "@/types/analytics";

export type UpdateRoundBody = {
  hole_scores?: {
    hole_number: number;
    strokes?: number | null;
    putts?: number | null;
    fairway_hit?: boolean | null;
    green_in_regulation?: boolean | null;
  }[];
  tee_box?: string | null;
  notes?: string;
  weather_conditions?: string;
  course_name_played?: string | null;
};

/** What saving an edit sends: a course to link first, if one was picked, then the round's update. */
export interface UpdateRequest {
  linkCourseId: string | null;
  body: UpdateRoundBody;
}

export interface RoundsRepository {
  getRoundsForUser(userId: string, limit?: number): Promise<RoundModel[]>;
  getRound(roundId: string): Promise<RoundDetail>;
  /** Saves an edit, linking a newly picked course first, and returns the round as saved. */
  saveRound(round: RoundDetail, edits: RoundEdits): Promise<RoundDetail>;
  deleteRound(roundId: string): Promise<void>;
  linkCourse(roundId: string, courseId: string): Promise<RoundModel>;
  getCourse(courseId: string): Promise<Course>;
  getRoundComparison(userId: string, roundId: string): Promise<RoundComparison | null>;
  getUserHandicap(userId: string): Promise<{ handicap_index: number | null }>;
  searchCourses(query: string, userId?: string): Promise<CourseSummary[]>;
}

export type CourseSearchRepository = Pick<RoundsRepository, "searchCourses">;

/** The requests an edit makes. An edit left undefined keeps the hole's value; null clears it. */
export function updateRequestFrom(round: RoundDetail, edits: RoundEdits): UpdateRequest {
  const { course } = edits;
  const linkCourseId =
    course.status === "linked" && course.course.id && course.course.id !== round.linkedCourse?.id
      ? course.course.id
      : null;

  const holeScores = round.holes.map((hole) => {
    const edited = edits.holes[hole.hole];
    return {
      hole_number: hole.hole,
      strokes: edited?.strokes !== undefined ? edited.strokes : hole.strokes,
      putts: edited?.putts !== undefined ? edited.putts : hole.putts,
      fairway_hit: hole.fairway,
      green_in_regulation: edited?.gir !== undefined ? edited.gir : hole.gir,
    };
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
  getRoundsForUser: async (userId, limit = 100) =>
    (await api.getRoundsForUser(userId, limit)).map(RoundModel.fromSummary),
  getRound: async (roundId) => RoundModel.detailFromDto(await api.getRound(roundId)),
  saveRound: async (round, edits) => {
    const { linkCourseId, body } = updateRequestFrom(round, edits);
    if (linkCourseId) await api.linkCourse(round.id, linkCourseId);
    return RoundModel.detailFromDto(await api.updateRound(round.id, body));
  },
  deleteRound: (roundId) => api.deleteRound(roundId),
  linkCourse: async (roundId, courseId) => RoundModel.fromSummary(await api.linkCourse(roundId, courseId)),
  getCourse: (courseId) => api.getCourse(courseId),
  getRoundComparison: (userId, roundId) => api.getRoundComparison(userId, roundId),
  getUserHandicap: (userId) => userRepository.getUserHandicap(userId),
  searchCourses: (query, userId) => api.searchCourses(query, userId),
};
