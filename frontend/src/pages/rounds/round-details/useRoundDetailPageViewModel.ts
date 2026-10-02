import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCourseName } from "@/lib/courseName";
import { messageFrom } from "@/lib/userFacingErrors";
import { queryKeys } from "@/data/queryKeys";
import { Round as RoundModel } from "@/domain/round";
import { getTee } from "@/domain/course";
import { ratedCourseHandicap } from "@/domain/handicap";
import type { Round } from "@/types/golf";
import { roundsRepository, type RoundsRepository } from "../roundsRepository";
import { useDeleteRound } from "../useDeleteRound";
import { teeRatingLabel } from "./roundDetailModel";
import { useRoundEditorViewModel, type RoundEditorViewModel } from "./useRoundEditorViewModel";

export type { CourseEdit, EditedScores } from "./roundEditorModel";

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
  /** Edit mode. Start it with `enterEditMode`, which also closes the page's other panels. */
  editor: RoundEditorViewModel;
  confirmDelete: boolean;
  deleting: boolean;
  /** A failed save, course pick or delete. Edits and deletes never overlap, so there is one at a time. */
  actionError: string | null;
  showLinkCourse: boolean;
  showLinkButton: boolean;
  showMomentum: boolean;
}

export interface RoundDetailPageViewModel extends RoundDetailUiState {
  enterEditMode: () => void;
  requestDelete: () => void;
  /** Deletes the round; `onDeleted` runs only if it worked. */
  confirmDeleteRound: (onDeleted: () => void) => void;
  cancelDelete: () => void;
  openLinkCourse: () => void;
  closeLinkCourse: () => void;
}

export function useRoundDetailPageViewModel(
  userId: string,
  roundId: string | undefined,
  repository: RoundsRepository = roundsRepository,
): RoundDetailPageViewModel {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showLinkCourse, setShowLinkCourse] = useState(false);
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

  const editor = useRoundEditorViewModel(userId, roundId, round, repository);
  const { start: startEditing } = editor;

  const enterEditMode = useCallback(() => {
    setShowLinkCourse(false);
    setConfirmDelete(false);
    resetDelete();
    startEditing();
  }, [resetDelete, startEditing]);

  const confirmDeleteRound = useCallback((onDeleted: () => void) => {
    if (!roundId) return;
    deleteRound(roundId, { onSuccess: onDeleted });
  }, [roundId, deleteRound]);

  const played = useMemo(() => {
    if (!round) return null;
    const model = RoundModel.fromDto(round);
    return editor.editing ? RoundModel.previewEdits(model, editor.scores, editor.activeCourse, editor.activeTeeBox) : model;
  }, [round, editor.editing, editor.scores, editor.activeCourse, editor.activeTeeBox]);
  const tee = getTee(editor.activeCourse, editor.activeTeeBox);

  return {
    loading: isLoading,
    loadError: isError ? messageFrom(roundError, "Could not load this round.") : null,
    round,
    played,
    courseName: formatCourseName(round?.course_name_played ?? round?.course?.name),
    courseHandicap: ratedCourseHandicap(handicapIndex, tee, played?.par ?? null),
    teeRating: teeRatingLabel(tee),
    editor,
    confirmDelete,
    deleting,
    actionError:
      editor.error ?? (deleteError ? messageFrom(deleteError, "Could not delete this round.") : null),
    showLinkCourse,
    showLinkButton: !!round && !editor.editing && !round.course && !showLinkCourse,
    showMomentum: (round?.hole_scores.filter((s) => s.strokes != null).length ?? 0) >= 3,
    enterEditMode,
    requestDelete: () => setConfirmDelete(true),
    confirmDeleteRound,
    cancelDelete: () => setConfirmDelete(false),
    openLinkCourse: () => setShowLinkCourse(true),
    closeLinkCourse: () => setShowLinkCourse(false),
  };
}
