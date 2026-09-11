import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCourseName } from "@/lib/courseName";
import { chooseCompatibleTee } from "@/lib/teeColor";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import { calcCourseHandicap, calcNetScore } from "@/types/golf";
import type { Course, CourseSummary, Round, Tee } from "@/types/golf";
import type { RoundComparison } from "@/types/analytics";
import { roundsRepository, type RoundsRepository } from "../roundsRepository";

export type EditedScores = Record<number, { strokes: number | null; putts: number | null; gir?: boolean | null }>;

export type CourseEdit =
  | { status: "linked"; course: Course }
  | { status: "custom"; name: string }
  | { status: "picking" };

export interface RoundDetailUiState {
  loading: boolean;
  loadError: string | null;
  round: Round | undefined;
  comparison: RoundComparison | null | undefined;
  courseName: string;
  totalScore: number;
  toPar: number | null;
  netScore: number | null;
  courseHandicap: number | null;
  tee: Tee | null;
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
  linking: boolean;
  courseQuery: string;
  courseResults: CourseSummary[];
  courseSearching: boolean;
  courseEdit: CourseEdit;
  editLinkedName: string | undefined;
  editCustomName: string | undefined;
  showKeepUnlinkedName: boolean;
  playedCourseName: string | null;
  showMomentum: boolean;
}

export interface RoundDetailPageViewModel extends RoundDetailUiState {
  enterEditMode: () => void;
  save: () => Promise<void>;
  cancelEdit: () => void;
  requestDelete: () => void;
  confirmDeleteRound: () => Promise<boolean>;
  cancelDelete: () => void;
  handleScoreChange: (holeNumber: number, field: "strokes" | "putts", value: number | null) => void;
  handleGirChange: (holeNumber: number, value: boolean | null) => void;
  setEditedTeeBox: (teeBox: string) => void;
  openLinkCourse: () => void;
  closeLinkCourse: () => void;
  handleCourseQuery: (query: string) => void;
  handleSelectCourse: (course: CourseSummary) => Promise<void>;
  handleSelectEditCourse: (course: CourseSummary) => Promise<void>;
  closeEditCourseSearch: () => void;
  useCustomName: (name: string) => void;
  startChangingCourse: () => void;
}

function courseParFor(round: Round, activeCourse: Course | null): number | null {
  if (activeCourse) {
    return activeCourse.holes.reduce((sum, h) => sum + (h.par ?? 0), 0) || null;
  }
  if (round.hole_scores.some((s) => s.par_played != null)) {
    return round.hole_scores.reduce((sum, s) => sum + (s.par_played ?? 0), 0);
  }
  return null;
}

function teeColorsFrom(course: Course | null | undefined): string[] {
  return course?.tees.map((t) => t.color).filter((c): c is string => !!c) ?? [];
}

function courseEditFromRound(round: Round): CourseEdit {
  if (round.course) return { status: "linked", course: round.course };
  if (round.course_name_played) return { status: "custom", name: round.course_name_played };
  return { status: "picking" };
}

function messageFrom(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useRoundDetailPageViewModel(
  userId: string,
  roundId: string | undefined,
  repository: RoundsRepository = roundsRepository,
): RoundDetailPageViewModel {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedScores, setEditedScores] = useState<EditedScores>({});
  const [editedTeeBox, setEditedTeeBox] = useState("");
  const [showLinkCourse, setShowLinkCourse] = useState(false);
  const [linking, setLinking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [courseEdit, setCourseEdit] = useState<CourseEdit>({ status: "picking" });
  const courseSearch = useCourseSearch(userId);
  const { reset: resetCourseSearch } = courseSearch;

  const {
    data: round,
    isLoading,
    isError,
    error: roundError,
  } = useQuery({
    queryKey: ["round", roundId],
    queryFn: () => repository.getRound(roundId!),
    enabled: !!roundId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: comparison } = useQuery({
    queryKey: ["round-comparison", userId, roundId],
    queryFn: () => repository.getRoundComparison(userId, roundId!),
    enabled: !!roundId,
  });
  const { data: handicapData } = useQuery({
    queryKey: ["handicap", userId],
    queryFn: () => repository.getUserHandicap(userId),
  });
  const handicapIndex = handicapData?.handicap_index ?? null;

  const enterEditMode = useCallback(() => {
    if (!round) return;
    const initial: EditedScores = {};
    for (const s of round.hole_scores) {
      if (s.hole_number != null) {
        initial[s.hole_number] = { strokes: s.strokes, putts: s.putts };
      }
    }
    setShowLinkCourse(false);
    resetCourseSearch();
    setEditedScores(initial);
    setEditedTeeBox(round.tee_box ?? "");
    setCourseEdit(courseEditFromRound(round));
    setConfirmDelete(false);
    setEditMode(true);
  }, [round, resetCourseSearch]);

  const cancelEdit = useCallback(() => {
    setEditMode(false);
    setEditedScores({});
    setCourseEdit({ status: "picking" });
    resetCourseSearch();
  }, [resetCourseSearch]);

  const save = useCallback(async () => {
    if (!round || !roundId) return;
    setSaving(true);
    setActionError(null);
    try {
      if (
        courseEdit.status === "linked" &&
        courseEdit.course.id &&
        courseEdit.course.id !== round.course?.id
      ) {
        await repository.linkCourse(roundId, courseEdit.course.id);
      }

      const holeScores = round.hole_scores
        .filter((s) => s.hole_number != null)
        .map((s) => {
          const edited = editedScores[s.hole_number!];
          const girValue = edited?.gir !== undefined ? edited.gir : s.green_in_regulation;
          return {
            hole_number: s.hole_number!,
            strokes: edited?.strokes ?? s.strokes,
            putts: edited?.putts ?? s.putts,
            fairway_hit: s.fairway_hit,
            green_in_regulation: girValue,
          };
        });

      let courseNamePlayed: string | null | undefined;
      if (courseEdit.status === "custom") {
        courseNamePlayed = courseEdit.name;
      } else if (round.course_name_played) {
        courseNamePlayed = null;
      }

      const updated = await repository.updateRound(roundId, {
        hole_scores: holeScores,
        tee_box: editedTeeBox || null,
        ...(courseNamePlayed !== undefined ? { course_name_played: courseNamePlayed } : {}),
      });
      queryClient.setQueryData(["round", roundId], updated);
      queryClient.invalidateQueries({ queryKey: ["round-comparison", userId, roundId] });
      queryClient.invalidateQueries({ queryKey: ["career-analytics", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
      setEditMode(false);
      setCourseEdit({ status: "picking" });
    } catch (err) {
      console.error("Save failed:", err);
      setActionError(messageFrom(err, "Could not save this round."));
    } finally {
      setSaving(false);
    }
  }, [round, roundId, editedScores, editedTeeBox, courseEdit, queryClient, userId, repository]);

  const confirmDeleteRound = useCallback(async () => {
    if (!roundId) return false;
    setDeleting(true);
    setActionError(null);
    try {
      await repository.deleteRound(roundId);
      queryClient.invalidateQueries({ queryKey: ["rounds", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
      queryClient.invalidateQueries({ queryKey: ["career-analytics", userId] });
      return true;
    } catch (err) {
      console.error("Delete failed:", err);
      setActionError(messageFrom(err, "Could not delete this round."));
      setDeleting(false);
      return false;
    }
  }, [roundId, userId, queryClient, repository]);

  const handleScoreChange = useCallback(
    (holeNumber: number, field: "strokes" | "putts", value: number | null) => {
      setEditedScores((prev) => ({
        ...prev,
        [holeNumber]: { ...prev[holeNumber], [field]: value },
      }));
    },
    [],
  );

  const handleGirChange = useCallback(
    (holeNumber: number, value: boolean | null) => {
      setEditedScores((prev) => ({
        ...prev,
        [holeNumber]: { ...prev[holeNumber], gir: value },
      }));
    },
    [],
  );

  const handleSelectCourse = useCallback(async (course: CourseSummary) => {
    if (!roundId) return;
    setLinking(true);
    setActionError(null);
    try {
      await repository.linkCourse(roundId, course.id);
      await queryClient.invalidateQueries({ queryKey: ["round", roundId] });
      setShowLinkCourse(false);
      resetCourseSearch();
    } catch (err) {
      console.error("Link failed:", err);
      setActionError(messageFrom(err, "Could not link this round to that course."));
    } finally {
      setLinking(false);
    }
  }, [roundId, queryClient, resetCourseSearch, repository]);

  const handleSelectEditCourse = useCallback(async (course: CourseSummary) => {
    setActionError(null);
    resetCourseSearch();
    try {
      const full = await repository.getCourse(course.id);
      const teeColors = teeColorsFrom(full);
      setCourseEdit({ status: "linked", course: full });
      setEditedTeeBox((prev) => {
        const current = prev.trim();
        if (teeColors.length === 0) return prev;
        if (current) {
          const matched = chooseCompatibleTee(current, teeColors);
          if (matched) return matched;
        }
        return teeColors.length === 1 ? teeColors[0] : "";
      });
    } catch (err) {
      setActionError(messageFrom(err, "Could not load that course."));
    }
  }, [repository, resetCourseSearch]);

  const activeCourse =
    editMode && courseEdit.status === "linked"
      ? courseEdit.course
      : round?.course ?? null;
  const totalScore = round
    ? round.hole_scores.reduce((sum, s) => {
        const strokes =
          editMode && s.hole_number != null && s.hole_number in editedScores
            ? editedScores[s.hole_number].strokes
            : s.strokes;
        return sum + (strokes ?? 0);
      }, 0)
    : 0;
  const coursePar = round ? courseParFor(round, activeCourse) : null;
  const toPar = coursePar !== null ? totalScore - coursePar : null;
  const courseName = formatCourseName(round?.course_name_played ?? round?.course?.name);
  const editLinkedName = courseEdit.status === "linked" ? courseEdit.course.name ?? undefined : undefined;
  const editCustomName = courseEdit.status === "custom" ? courseEdit.name : undefined;
  const activeTeeBox = editMode ? editedTeeBox : round?.tee_box;
  const tee = activeTeeBox
    ? activeCourse?.tees.find((t) => t.color?.toLowerCase() === activeTeeBox.toLowerCase()) ?? null
    : null;
  const courseHandicap =
    handicapIndex != null &&
    tee?.slope_rating != null &&
    tee?.course_rating != null &&
    coursePar != null
      ? calcCourseHandicap(handicapIndex, tee.slope_rating, tee.course_rating, coursePar)
      : null;
  const netScore = courseHandicap != null && totalScore > 0
    ? calcNetScore(totalScore, courseHandicap)
    : null;

  return {
    loading: isLoading,
    loadError: isError ? messageFrom(roundError, "Could not load this round.") : null,
    round,
    comparison,
    courseName,
    totalScore,
    toPar,
    netScore,
    courseHandicap,
    tee,
    editMode,
    saving,
    confirmDelete,
    deleting,
    actionError,
    editedScores,
    editedTeeBox,
    availableTees: teeColorsFrom(activeCourse),
    showLinkCourse,
    showLinkButton: !!round && !editMode && !round.course && !showLinkCourse,
    linking,
    courseQuery: courseSearch.query,
    courseResults: courseSearch.results,
    courseSearching: courseSearch.searching,
    courseEdit,
    editLinkedName,
    editCustomName,
    showKeepUnlinkedName: !!(
      editMode &&
      courseEdit.status === "picking" &&
      round?.course_name_played &&
      !courseSearch.query
    ),
    playedCourseName: round?.course_name_played ?? null,
    showMomentum: (round?.hole_scores.filter((s) => s.strokes != null).length ?? 0) >= 3,
    enterEditMode,
    save,
    cancelEdit,
    requestDelete: () => setConfirmDelete(true),
    confirmDeleteRound,
    cancelDelete: () => setConfirmDelete(false),
    handleScoreChange,
    handleGirChange,
    setEditedTeeBox,
    openLinkCourse: () => {
      resetCourseSearch();
      setShowLinkCourse(true);
    },
    closeLinkCourse: () => {
      setShowLinkCourse(false);
      resetCourseSearch();
    },
    handleCourseQuery: courseSearch.setQuery,
    handleSelectCourse,
    handleSelectEditCourse,
    closeEditCourseSearch: () => {
      if (round) setCourseEdit(courseEditFromRound(round));
      resetCourseSearch();
    },
    useCustomName: (name: string) => {
      setCourseEdit({ status: "custom", name });
      resetCourseSearch();
    },
    startChangingCourse: () => {
      setCourseEdit({ status: "picking" });
      resetCourseSearch();
    },
  };
}
