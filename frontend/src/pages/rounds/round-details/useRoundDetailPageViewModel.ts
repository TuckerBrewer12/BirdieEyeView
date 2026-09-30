import { useState, useMemo, useCallback, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCourseName } from "@/lib/courseName";
import { messageFrom } from "@/lib/userFacingErrors";
import { queryKeys } from "@/data/queryKeys";
import { Round as RoundModel } from "@/domain/round";
import { getTee, teeColors } from "@/domain/course";
import { ratedCourseHandicap } from "@/domain/handicap";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import type { CourseSummary, Round } from "@/types/golf";
import { roundsRepository, type RoundsRepository } from "../roundsRepository";
import { useSaveRound } from "../useSaveRound";
import { useDeleteRound } from "../useDeleteRound";
import { teeRatingLabel } from "./roundDetailModel";
import {
  closedEditor,
  roundEditor,
  saveRequestFrom,
  type CourseEdit,
  type EditedScores,
} from "./roundEditorModel";

export type { CourseEdit, EditedScores };

const NO_EDITS: EditedScores = {};
const PICKING: CourseEdit = { status: "picking" };

export interface RoundDetailUiState {
  loading: boolean;
  loadError: string | null;
  /** The round as the API sends it, for the edit form and the not-yet-migrated scorecard views. */
  round: Round | undefined;
  /** The round as played: read against the course being edited in, with edited strokes applied. */
  played: RoundModel | null;
  courseName: string;
  courseHandicap: number | null;
  teeRating: string | null;
  editMode: boolean;
  saving: boolean;
  confirmDelete: boolean;
  deleting: boolean;
  actionError: string | null;
  editedScores: EditedScores;
  editedTeeBox: string;
  availableTees: string[];
  showLinkCourse: boolean;
  showLinkButton: boolean;
  courseQuery: string;
  courseResults: CourseSummary[];
  courseSearching: boolean;
  courseEdit: CourseEdit;
  editLinkedName: string | undefined;
  editCustomName: string | undefined;
  keepUnlinkedNameLabel: string | null;
  showMomentum: boolean;
}

export interface RoundDetailPageViewModel extends RoundDetailUiState {
  enterEditMode: () => void;
  save: () => void;
  cancelEdit: () => void;
  requestDelete: () => void;
  /** Deletes the round; `onDeleted` runs only if it worked. */
  confirmDeleteRound: (onDeleted: () => void) => void;
  cancelDelete: () => void;
  handleScoreChange: (holeNumber: number, field: "strokes" | "putts", value: number | null) => void;
  handleGirChange: (holeNumber: number, value: boolean | null) => void;
  setEditedTeeBox: (teeBox: string) => void;
  openLinkCourse: () => void;
  closeLinkCourse: () => void;
  handleCourseQuery: (query: string) => void;
  handleSelectEditCourse: (course: CourseSummary) => Promise<void>;
  closeEditCourseSearch: () => void;
  useCustomName: (name: string) => void;
  keepUnlinkedName: () => void;
  startChangingCourse: () => void;
}

export function useRoundDetailPageViewModel(
  userId: string,
  roundId: string | undefined,
  repository: RoundsRepository = roundsRepository,
): RoundDetailPageViewModel {
  const [editor, dispatch] = useReducer(roundEditor, closedEditor);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showLinkCourse, setShowLinkCourse] = useState(false);
  const [courseLoadError, setCourseLoadError] = useState<string | null>(null);
  const courseSearch = useCourseSearch(userId, repository);
  const { reset: resetCourseSearch } = courseSearch;
  const { mutate: saveRound, isPending: saving, error: saveError, reset: resetSave } =
    useSaveRound(userId, repository);
  const { mutate: deleteRound, isPending: deleting, error: deleteError, reset: resetDelete } =
    useDeleteRound(userId, repository);

  const {
    data: round,
    isLoading,
    isError,
    error: roundError,
  } = useQuery({
    queryKey: queryKeys.round(roundId),
    queryFn: () => repository.getRound(roundId!),
    enabled: !!roundId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: handicapData } = useQuery({
    queryKey: queryKeys.handicap(userId),
    queryFn: () => repository.getUserHandicap(userId),
  });
  const handicapIndex = handicapData?.handicap_index ?? null;

  const editMode = editor.editing;
  const editedScores = editor.editing ? editor.scores : NO_EDITS;
  const editedTeeBox = editor.editing ? editor.teeBox : "";
  const courseEdit = editor.editing ? editor.course : PICKING;

  // One message at a time: starting an action clears whatever the last one left.
  const clearErrors = useCallback(() => {
    resetSave();
    resetDelete();
    setCourseLoadError(null);
  }, [resetSave, resetDelete]);

  const enterEditMode = useCallback(() => {
    if (!round) return;
    setShowLinkCourse(false);
    resetCourseSearch();
    setConfirmDelete(false);
    dispatch({ type: "start", round });
  }, [round, resetCourseSearch]);

  const cancelEdit = useCallback(() => {
    dispatch({ type: "stop" });
    resetCourseSearch();
  }, [resetCourseSearch]);

  const save = useCallback(() => {
    if (!round || !roundId || !editor.editing) return;
    clearErrors();
    saveRound(
      { roundId, ...saveRequestFrom(round, editor) },
      { onSuccess: () => dispatch({ type: "stop" }) },
    );
  }, [round, roundId, editor, clearErrors, saveRound]);

  const confirmDeleteRound = useCallback((onDeleted: () => void) => {
    if (!roundId) return;
    clearErrors();
    deleteRound(roundId, { onSuccess: onDeleted });
  }, [roundId, clearErrors, deleteRound]);

  const handleSelectEditCourse = useCallback(async (course: CourseSummary) => {
    clearErrors();
    resetCourseSearch();
    try {
      dispatch({ type: "linkCourse", course: await repository.getCourse(course.id) });
    } catch (err) {
      setCourseLoadError(messageFrom(err, "Could not load that course."));
    }
  }, [repository, clearErrors, resetCourseSearch]);

  const activeCourse =
    editor.editing && editor.course.status === "linked"
      ? editor.course.course
      : round?.course ?? null;
  const played = useMemo(() => {
    if (!round) return null;
    const model = RoundModel.fromDto(round);
    return editMode ? RoundModel.previewEdits(model, editedScores, activeCourse) : model;
  }, [round, activeCourse, editMode, editedScores]);
  const courseName = formatCourseName(round?.course_name_played ?? round?.course?.name);

  const editLinkedName = courseEdit.status === "linked" ? courseEdit.course.name ?? undefined : undefined;
  const editCustomName = courseEdit.status === "custom" ? courseEdit.name : undefined;
  const activeTeeBox = editMode ? editedTeeBox : round?.tee_box;
  const tee = getTee(activeCourse, activeTeeBox);

  const playedCourseName = round?.course_name_played ?? null;
  const keepUnlinkedNameLabel =
    editMode && courseEdit.status === "picking" && playedCourseName && !courseSearch.query
      ? `Keep "${playedCourseName}" without linking →`
      : null;
  const actionError =
    (saveError && messageFrom(saveError, "Could not save this round.")) ||
    (deleteError && messageFrom(deleteError, "Could not delete this round.")) ||
    courseLoadError;

  return {
    loading: isLoading,
    loadError: isError ? messageFrom(roundError, "Could not load this round.") : null,
    round,
    played,
    courseName,
    courseHandicap: ratedCourseHandicap(handicapIndex, tee, played?.par ?? null),
    teeRating: teeRatingLabel(tee),
    editMode,
    saving,
    confirmDelete,
    deleting,
    actionError,
    editedScores,
    editedTeeBox,
    availableTees: teeColors(activeCourse),
    showLinkCourse,
    showLinkButton: !!round && !editMode && !round.course && !showLinkCourse,
    courseQuery: courseSearch.query,
    courseResults: courseSearch.results,
    courseSearching: courseSearch.searching,
    courseEdit,
    editLinkedName,
    editCustomName,
    keepUnlinkedNameLabel,
    showMomentum: (round?.hole_scores.filter((s) => s.strokes != null).length ?? 0) >= 3,
    enterEditMode,
    save,
    cancelEdit,
    requestDelete: () => setConfirmDelete(true),
    confirmDeleteRound,
    cancelDelete: () => setConfirmDelete(false),
    handleScoreChange: (hole, field, value) => dispatch({ type: "setScore", hole, field, value }),
    handleGirChange: (hole, value) => dispatch({ type: "setGir", hole, value }),
    setEditedTeeBox: (teeBox) => dispatch({ type: "setTeeBox", teeBox }),
    openLinkCourse: () => setShowLinkCourse(true),
    closeLinkCourse: () => setShowLinkCourse(false),
    handleCourseQuery: courseSearch.setQuery,
    handleSelectEditCourse,
    closeEditCourseSearch: () => {
      if (round) dispatch({ type: "restoreCourse", round });
      resetCourseSearch();
    },
    useCustomName: (name) => {
      dispatch({ type: "useCustomName", name });
      resetCourseSearch();
    },
    keepUnlinkedName: () => {
      if (!playedCourseName) return;
      dispatch({ type: "useCustomName", name: playedCourseName });
      resetCourseSearch();
    },
    startChangingCourse: () => {
      dispatch({ type: "changeCourse" });
      resetCourseSearch();
    },
  };
}
