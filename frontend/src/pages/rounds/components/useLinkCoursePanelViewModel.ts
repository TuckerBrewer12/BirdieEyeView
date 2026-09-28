import { useCallback } from "react";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import { messageFrom } from "@/lib/userFacingErrors";
import type { CourseSummary } from "@/types/golf";
import { roundsRepository, type RoundsRepository } from "../roundsRepository";
import { useLinkCourse } from "../useLinkCourse";

export interface LinkCoursePanelViewModel {
  query: string;
  results: CourseSummary[];
  searching: boolean;
  linking: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  selectCourse: (course: CourseSummary) => void;
}

/**
 * One round's course-link panel: search saved courses, pick one, link it.
 * The panel mounts when it opens and unmounts when it closes, so its search
 * and error start empty each time without anything resetting them.
 */
export function useLinkCoursePanelViewModel(
  userId: string,
  roundId: string,
  onLinked: () => void,
  repository: RoundsRepository = roundsRepository,
): LinkCoursePanelViewModel {
  const search = useCourseSearch(userId, repository);
  const { mutate: linkCourse, isPending: linking, error } = useLinkCourse(userId, repository);

  const selectCourse = useCallback(
    (course: CourseSummary) => {
      linkCourse({ roundId, courseId: course.id }, { onSuccess: onLinked });
    },
    [linkCourse, roundId, onLinked],
  );

  return {
    query: search.query,
    results: search.results,
    searching: search.searching,
    linking,
    error: error ? messageFrom(error, "Could not link that round to the selected course.") : null,
    setQuery: search.setQuery,
    selectCourse,
  };
}
