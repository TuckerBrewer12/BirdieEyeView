import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { messageFrom } from "@/lib/userFacingErrors";
import { queryKeys } from "@/data/queryKeys";
import { Round, roundLine } from "@/domain/round";
import { formatTeeName, getTee, teeRatingLabel } from "@/domain/course";
import { formatWeekday } from "@/domain/date";
import { roundsRepository, type RoundsRepository } from "../roundsRepository";
import { useDeleteRound } from "../useDeleteRound";
import { teeOptions } from "./roundDetailModel";
import { useRoundEditorViewModel, type RoundEditorViewModel } from "./useRoundEditorViewModel";

export interface RoundDetailUiState {
  loading: boolean;
  loadError: string | null;
  /** The round as played: read against the course and tee being edited in, with the edits applied. */
  played: Round | null;
  /** Over the course name: "Mon, Jun 15, 2026 · Blue tees · 72.4 / 130". */
  dateLine: string | null;
  /** The round as the delete dialog names it: "Half Moon Bay · Jun 15 · 78". */
  deleteLine: string;
  /** The course's tees as edit mode's chips; none when the course has no tees on file. */
  teeOptions: { name: string; yards: number | null }[];
  /** Edit mode. Start it with `enterEditMode`, which also closes the page's other panels. */
  editor: RoundEditorViewModel;
  confirmDelete: boolean;
  deleting: boolean;
  /** A failed save, course pick or delete. Edits and deletes never overlap, so there is one at a time. */
  actionError: string | null;
  showLinkCourse: boolean;
  /** A round with no course behind it, out of edit mode, can be linked to one. */
  canLink: boolean;
  /** The round flow chart: three or more holes with the server's running to par. An unsaved score edit has none. */
  showFlow: boolean;
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
    // The round's flow is the server's, so an edit that changes a hole's score hides it until the save.
    showFlow: (played?.holes.filter((hole) => hole.runningToPar != null).length ?? 0) >= 3,
    enterEditMode,
    requestDelete: () => setConfirmDelete(true),
    confirmDeleteRound,
    cancelDelete: () => setConfirmDelete(false),
    openLinkCourse: () => setShowLinkCourse(true),
    closeLinkCourse: () => setShowLinkCourse(false),
  };
}
