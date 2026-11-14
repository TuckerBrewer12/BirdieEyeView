import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { messageFrom } from "@/lib/userFacingErrors";
import { queryKeys } from "@/data/queryKeys";
import { Round, roundLine } from "@/domain/round";
import { formatTeeName, getTee, teeOptions, teeRatingLabel, type TeeChoice } from "@/domain/course";
import { formatWeekday } from "@/domain/date";
import { roundsRepository, type RoundsRepository } from "../roundsRepository";
import { useDeleteRound } from "../useDeleteRound";
import { useRoundEditorViewModel, type RoundEditorViewModel } from "./useRoundEditorViewModel";

export interface RoundDetailUiState {
  loading: boolean;
  loadError: string | null;
  played: Round | null;
  dateLine: string | null;
  deleteLine: string;
  teeOptions: TeeChoice[];
  editor: RoundEditorViewModel;
  confirmDelete: boolean;
  deleting: boolean;
  actionError: string | null;
  showLinkCourse: boolean;
  canLink: boolean;
  showFlow: boolean;
}

export interface RoundDetailPageViewModel extends RoundDetailUiState {
  enterEditMode: () => void;
  requestDelete: () => void;
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

  const editor = useRoundEditorViewModel(userId, round, repository);
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
    return editor.editing ? Round.previewEdits(round, editor.scores, editor.activeCourse, editor.activeTeeBox) : round;
  }, [round, editor.editing, editor.scores, editor.activeCourse, editor.activeTeeBox]);
  const tee = getTee(editor.activeCourse, editor.activeTeeBox);

  return {
    loading: isLoading,
    loadError: isError ? messageFrom(roundError, "Could not load this round.") : null,
    played,
    dateLine:
      [formatWeekday(played?.date), played?.teeBox ? formatTeeName(played.teeBox) : null, teeRatingLabel(tee)]
        .filter(Boolean)
        .join(" · ") || null,
    deleteLine: played ? roundLine(played) : "",
    teeOptions: teeOptions(editor.activeCourse),
    editor,
    confirmDelete,
    deleting,
    actionError:
      editor.error ?? (deleteError ? messageFrom(deleteError, "Could not delete this round.") : null),
    showLinkCourse,
    canLink: !!round && !editor.editing && !round.linkedCourse,
    showFlow: (played?.holes.filter((hole) => hole.runningToPar != null).length ?? 0) >= 3,
    enterEditMode,
    requestDelete: () => setConfirmDelete(true),
    confirmDeleteRound,
    cancelDelete: () => setConfirmDelete(false),
    openLinkCourse: () => setShowLinkCourse(true),
    closeLinkCourse: () => setShowLinkCourse(false),
  };
}
