import { useCallback, useReducer, useState } from "react";
import { teeColors } from "@/domain/course";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import { messageFrom } from "@/lib/userFacingErrors";
import type { CourseEdit, HoleEdits, RoundDetail } from "@/domain";
import type { Course, CourseSummary } from "@/types/golf";
import { roundsRepository, type RoundsRepository } from "../roundsRepository";
import { useSaveRound } from "../useSaveRound";
import { closedEditor, roundEditor } from "./roundEditorModel";

const NO_EDITS: HoleEdits = {};
const PICKING: CourseEdit = { status: "picking" };

export interface RoundEditorViewModel {
  editing: boolean;
  saving: boolean;
  /** Why the last save or course pick failed; cleared when editing starts or stops. */
  error: string | null;
  scores: HoleEdits;
  teeBox: string;
  course: CourseEdit;
  /** The course and tee the round is read against: the ones being edited in, else the round's own. */
  activeCourse: Course | null;
  activeTeeBox: string | null;
  availableTees: string[];
  linkedName: string | undefined;
  customName: string | undefined;
  /** The name the round was played under, offered while picking with an empty search. */
  playedNameToKeep: string | null;
  courseQuery: string;
  courseResults: CourseSummary[];
  courseSearching: boolean;
  start: () => void;
  cancel: () => void;
  save: () => void;
  setScore: (hole: number, field: "strokes" | "putts", value: number | null) => void;
  setGir: (hole: number, value: boolean | null) => void;
  setTeeBox: (teeBox: string) => void;
  searchCourses: (query: string) => void;
  pickCourse: (course: CourseSummary) => Promise<void>;
  closeCourseSearch: () => void;
  setCustomName: (name: string) => void;
  keepPlayedName: () => void;
  changeCourse: () => void;
}

/** Editing one round: scores, tee and course, then saving them. */
export function useRoundEditorViewModel(
  userId: string,
  round: RoundDetail | undefined,
  repository: RoundsRepository = roundsRepository,
): RoundEditorViewModel {
  const [editor, dispatch] = useReducer(roundEditor, closedEditor);
  const [courseLoadError, setCourseLoadError] = useState<string | null>(null);
  const search = useCourseSearch(userId, repository);
  const { reset: resetSearch } = search;
  const { mutate: saveRound, isPending: saving, error: saveError, reset: resetSave } =
    useSaveRound(userId, repository);

  const clearErrors = useCallback(() => {
    resetSave();
    setCourseLoadError(null);
  }, [resetSave]);

  const start = useCallback(() => {
    if (!round) return;
    clearErrors();
    resetSearch();
    dispatch({ type: "start", round });
  }, [round, clearErrors, resetSearch]);

  const cancel = useCallback(() => {
    clearErrors();
    resetSearch();
    dispatch({ type: "stop" });
  }, [clearErrors, resetSearch]);

  const save = useCallback(() => {
    if (!round || !editor.editing) return;
    clearErrors();
    const { holes, teeBox, course } = editor;
    saveRound(
      { round, edits: { holes, teeBox, course } },
      { onSuccess: () => dispatch({ type: "stop" }) },
    );
  }, [round, editor, clearErrors, saveRound]);

  const pickCourse = useCallback(async (course: CourseSummary) => {
    clearErrors();
    resetSearch();
    try {
      dispatch({ type: "linkCourse", course: await repository.getCourse(course.id) });
    } catch (err) {
      setCourseLoadError(messageFrom(err, "Could not load that course."));
    }
  }, [repository, clearErrors, resetSearch]);

  const course = editor.editing ? editor.course : PICKING;
  const activeCourse =
    editor.editing && editor.course.status === "linked" ? editor.course.course : round?.linkedCourse ?? null;
  const playedName = round?.playedName ?? null;

  return {
    editing: editor.editing,
    saving,
    error: saveError ? messageFrom(saveError, "Could not save this round.") : courseLoadError,
    scores: editor.editing ? editor.holes : NO_EDITS,
    teeBox: editor.editing ? editor.teeBox : "",
    course,
    activeCourse,
    activeTeeBox: editor.editing ? editor.teeBox : round?.teeBox ?? null,
    availableTees: teeColors(activeCourse),
    linkedName: course.status === "linked" ? course.course.name ?? undefined : undefined,
    customName: course.status === "custom" ? course.name : undefined,
    playedNameToKeep:
      editor.editing && course.status === "picking" && !search.query ? playedName : null,
    courseQuery: search.query,
    courseResults: search.results,
    courseSearching: search.searching,
    start,
    cancel,
    save,
    setScore: (hole, field, value) => dispatch({ type: "setScore", hole, field, value }),
    setGir: (hole, value) => dispatch({ type: "setGir", hole, value }),
    setTeeBox: (teeBox) => dispatch({ type: "setTeeBox", teeBox }),
    searchCourses: search.setQuery,
    pickCourse,
    closeCourseSearch: () => {
      if (round) dispatch({ type: "restoreCourse", round });
      resetSearch();
    },
    setCustomName: (name) => {
      dispatch({ type: "useCustomName", name });
      resetSearch();
    },
    keepPlayedName: () => {
      if (!playedName) return;
      dispatch({ type: "useCustomName", name: playedName });
      resetSearch();
    },
    changeCourse: () => {
      dispatch({ type: "changeCourse" });
      resetSearch();
    },
  };
}
