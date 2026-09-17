import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateLong } from "@/lib/roundDate";
import { messageFrom } from "@/lib/userFacingErrors";
import { scoreKeyFor, type ScoreKey } from "@/brand/theme";
import { useRoundHoles, type HoleData } from "@/hooks/useRoundHoles";
import { chooseCompatibleTee } from "@/lib/teeColor";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import { calcCourseHandicap, calcNetScore } from "@/types/golf";
import type { Course, CourseSummary, Round } from "@/types/golf";
import type { ComparisonRow, RoundComparison } from "@/types/analytics";
import { roundsRepository, type RoundsRepository } from "../roundsRepository";

export type EditedScores = Record<number, { strokes: number | null; putts: number | null; gir?: boolean | null }>;

export type CourseEdit =
  | { status: "linked"; course: Course }
  | { status: "custom"; name: string }
  | { status: "picking" };

export type ChartTabKey = "score" | "short_game" | "gir";

export interface ChartTabItem {
  key: ChartTabKey;
  label: string;
}

export interface ComparisonChartItem {
  title: string;
  primaryLabel: string;
  group: ChartTabKey;
  bars: { label: string; value: number | null; sampleSize: number }[];
}

const CHART_TABS: { key: ChartTabKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "short_game", label: "Short Game" },
  { key: "gir", label: "GIR" },
];

function barsFrom(rows: ComparisonRow[]) {
  return rows.map((row) => ({
    label: row.label,
    value: row.primary_value,
    sampleSize: row.sample_size,
  }));
}

function chartsFrom(comparison: RoundComparison): ComparisonChartItem[] {
  return [
    { title: "Score", primaryLabel: "score", group: "score", bars: barsFrom(comparison.score) },
    { title: "Putts", primaryLabel: "putts", group: "short_game", bars: barsFrom(comparison.putts) },
    { title: "GIR", primaryLabel: "GIR", group: "gir", bars: barsFrom(comparison.gir) },
    { title: "3-Putts", primaryLabel: "3-putts", group: "short_game", bars: barsFrom(comparison.three_putts) },
    { title: "Putts per GIR", primaryLabel: "putts/GIR", group: "short_game", bars: barsFrom(comparison.putts_per_gir) },
    { title: "Scrambling", primaryLabel: "scramble successes", group: "short_game", bars: barsFrom(comparison.scrambling) },
  ];
}

export interface Nine {
  holes: HoleData[];
  total: number | null;
}

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
  dateLabel: string | null;
  teeRating: string | null;
  frontNine: Nine;
  backNine: Nine;
  scoreCounts: Partial<Record<ScoreKey, number>>;
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
  keepUnlinkedNameLabel: string | null;
  showMomentum: boolean;
  showComparison: boolean;
  charts: ComparisonChartItem[];
  selectedCharts: ComparisonChartItem[];
  /** Two-up on mobile when the active tab has more than one chart. */
  packSelectedCharts: boolean;
  chartTab: ChartTabKey;
  chartTabs: ChartTabItem[];
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
  keepUnlinkedName: () => void;
  startChangingCourse: () => void;
  selectChartTab: (key: string) => void;
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

/** useRoundHoles needs a Round; this stands in while one is still loading. */
const EMPTY_ROUND = { hole_scores: [], course: null } as unknown as Round;

function nineFrom(holes: HoleData[]): Nine {
  return {
    holes,
    total: holes.length === 9 ? holes.reduce((sum, h) => sum + h.strokes, 0) : null,
  };
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
  const [chartTab, setChartTab] = useState<ChartTabKey>("score");
  const courseSearch = useCourseSearch(userId, repository);
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

  // front_nine/back_nine and the score-type counts arrive precomputed on the
  // round list, but the detail endpoint returns a bare Round, so they are
  // derived here rather than in the view.
  const holes = useRoundHoles(round ?? EMPTY_ROUND);
  const frontNine = useMemo(() => nineFrom(holes.filter((h) => h.hole <= 9)), [holes]);
  const backNine = useMemo(() => nineFrom(holes.filter((h) => h.hole >= 10)), [holes]);
  const scoreCounts = useMemo(() => {
    const counts: Partial<Record<ScoreKey, number>> = {};
    for (const h of holes) {
      const key = scoreKeyFor(h.strokes, h.par);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [holes]);

  const editLinkedName = courseEdit.status === "linked" ? courseEdit.course.name ?? undefined : undefined;
  const editCustomName = courseEdit.status === "custom" ? courseEdit.name : undefined;
  const activeTeeBox = editMode ? editedTeeBox : round?.tee_box;
  const tee = activeTeeBox
    ? activeCourse?.tees.find((t) => t.color?.toLowerCase() === activeTeeBox.toLowerCase()) ?? null
    : null;
  const teeRating =
    tee?.course_rating != null && tee?.slope_rating != null
      ? `${tee.course_rating} / ${tee.slope_rating}`
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
  const charts = comparison ? chartsFrom(comparison) : [];
  const selectedCharts = charts.filter((chart) => chart.group === chartTab);
  const chartTabs = CHART_TABS;
  const playedCourseName = round?.course_name_played ?? null;
  const keepUnlinkedNameLabel =
    editMode && courseEdit.status === "picking" && playedCourseName && !courseSearch.query
      ? `Keep "${playedCourseName}" without linking →`
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
    dateLabel: formatRoundDateLong(round?.date),
    teeRating,
    frontNine,
    backNine,
    scoreCounts,
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
    keepUnlinkedNameLabel,
    showMomentum: (round?.hole_scores.filter((s) => s.strokes != null).length ?? 0) >= 3,
    showComparison: comparison != null,
    charts,
    selectedCharts,
    packSelectedCharts: selectedCharts.length > 1,
    chartTab,
    chartTabs,
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
    keepUnlinkedName: () => {
      if (!playedCourseName) return;
      setCourseEdit({ status: "custom", name: playedCourseName });
      resetCourseSearch();
    },
    startChangingCourse: () => {
      setCourseEdit({ status: "picking" });
      resetCourseSearch();
    },
    selectChartTab: (key: string) => {
      if (CHART_TABS.some((tab) => tab.key === key)) {
        setChartTab(key as ChartTabKey);
      }
    },
  };
}
