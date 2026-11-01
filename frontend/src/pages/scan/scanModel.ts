import { initializeScores } from "@/lib/scanUtils";
import type { SaveScanRequestDto } from "@/types/api";
import type { Course, CourseSummary } from "@/types/golf";
import type { ExtractedHoleScore, ManualTee, ScanResult, ScoreMetadata } from "@/types/scan";

/** Read a photographed card, or type the scores in by hand. */
export type ScanMode = "scan" | "manual";

export type ScanStep = "upload" | "processing" | "setup" | "review" | "success";

/** How many phases the processing screen walks through while a scan is read. */
export const SCAN_PHASE_COUNT = 4;
/** The scan reports no progress, so each phase is held this long rather than reported. */
export const SCAN_PHASE_HOLD_MS = 3500;

/** A course the golfer chose. No id means a name they typed for a course we don't have. */
export interface PickedCourse {
  id: string | null;
  name: string;
}

/** What the golfer chose before typing scores in by hand. */
export interface ManualSetup {
  course: PickedCourse | null;
  teeBox: string;
  /** `YYYY-MM-DD`. */
  date: string;
}

/**
 * The card being checked before it is saved. Its shape is the legacy review step's, which
 * still draws it; the review moves onto `Round.fromScan` and `Round.previewEdits` next.
 */
export interface ScanReviewDraft {
  result: ScanResult;
  editedScores: ExtractedHoleScore[];
  scoreMetadata: ScoreMetadata[];
  /** `YYYY-MM-DD`. */
  editedDate: string;
  editedTeeBox: string | null;
  reviewCourseId: string | null;
  reviewExternalCourseId: string | null;
  reviewCourseName: string | null;
}

/** The parts of a review the golfer sets outright, rather than hole by hole. */
export type ReviewDetails = Pick<
  ScanReviewDraft,
  "editedDate" | "editedTeeBox" | "reviewCourseId" | "reviewExternalCourseId" | "reviewCourseName"
>;

export type ScoreField = "strokes" | "putts" | "hole_number";

/** Today as `YYYY-MM-DD`, the date a round defaults to. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().substring(0, 10);
}

/** A course name as a search query: trimmed, single-spaced. */
export function courseQueryFrom(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ");
}

/** A finished scan, ready to check. Estimated putts and greens are filled in and flagged. */
export function reviewFromScan(result: ScanResult, today: string): ScanReviewDraft {
  const { round } = result;
  const { editedScores, scoreMetadata } = initializeScores(
    round.hole_scores,
    result.fields_needing_review,
    round.course?.holes ?? [],
  );
  const onlyTee = round.course?.tees?.length === 1 ? round.course.tees[0].color : null;
  return {
    result,
    editedScores,
    scoreMetadata,
    editedDate: round.date ? round.date.substring(0, 10) : today,
    editedTeeBox: round.tee_box ?? onlyTee ?? null,
    reviewCourseId: null,
    reviewExternalCourseId: null,
    // A course name read off the card is often noisy, so it is shown but never linked.
    reviewCourseName: round.course?.name ?? null,
  };
}

/** A blank card for typing scores in: the chosen course's holes, or eighteen unknown ones. */
export function reviewFromSetup(setup: ManualSetup, course: Course | null): ScanReviewDraft {
  const holes = course?.holes.length
    ? course.holes.map((hole) => ({ number: hole.number, par: hole.par, handicap: hole.handicap }))
    : Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: null, handicap: null }));
  const tees: ManualTee[] = (course?.tees ?? []).map((tee) => ({
    color: tee.color,
    slope_rating: tee.slope_rating,
    course_rating: tee.course_rating,
    hole_yardages: { ...tee.hole_yardages },
  }));
  const blankScores: ExtractedHoleScore[] = holes.map((hole) => ({
    hole_number: hole.number,
    strokes: null,
    putts: null,
    shots_to_green: null,
    fairway_hit: null,
    green_in_regulation: null,
  }));

  const result: ScanResult = {
    round: {
      course: setup.course
        ? { name: setup.course.name, location: course?.location ?? null, par: course?.par ?? null, holes, tees }
        : null,
      tee_box: setup.teeBox || null,
      date: setup.date,
      hole_scores: blankScores,
      notes: null,
    },
    confidence: { overall: 1, level: "high", hole_scores: [] },
    fields_needing_review: [],
  };
  const { editedScores, scoreMetadata } = initializeScores(blankScores, [], holes);

  return {
    result,
    editedScores,
    scoreMetadata,
    editedDate: setup.date,
    editedTeeBox: setup.teeBox || null,
    reviewCourseId: setup.course?.id ?? null,
    reviewExternalCourseId: null,
    reviewCourseName: setup.course?.name ?? null,
  };
}

/** One typed score. Typing putts over an estimate makes it the golfer's own. */
export function withScore(
  draft: ScanReviewDraft,
  index: number,
  field: ScoreField,
  value: string,
): ScanReviewDraft {
  const parsed = value === "" ? null : Number.parseInt(value, 10);
  const number = parsed == null || Number.isNaN(parsed) ? null : parsed;
  const editedScores = draft.editedScores.map((score, i) =>
    i === index ? { ...score, [field]: number } : score,
  );
  const scoreMetadata =
    field === "putts" && draft.scoreMetadata[index]?.putts_estimated
      ? draft.scoreMetadata.map((meta, i) => (i === index ? { ...meta, putts_estimated: false } : meta))
      : draft.scoreMetadata;
  return { ...draft, editedScores, scoreMetadata };
}

/** One green set by hand, replacing any worked-out guess. */
export function withGir(draft: ScanReviewDraft, index: number, value: boolean | null): ScanReviewDraft {
  const editedScores = draft.editedScores.map((score, i) =>
    i === index ? { ...score, green_in_regulation: value } : score,
  );
  const scoreMetadata = draft.scoreMetadata[index]?.gir_calculated
    ? draft.scoreMetadata.map((meta, i) => (i === index ? { ...meta, gir_calculated: false } : meta))
    : draft.scoreMetadata;
  return { ...draft, editedScores, scoreMetadata };
}

/** A search result as the course to save the round against, or why it can't be. */
export function reviewCourseFrom(
  course: CourseSummary,
): { link: Pick<ScanReviewDraft, "reviewCourseId" | "reviewExternalCourseId" | "reviewCourseName"> } | { error: string } {
  const external = course.source === "external" || course.id.startsWith("external:");
  if (external && !course.external_course_id) {
    return {
      error: "External course result is missing provider ID. Please choose another match or enter a custom name.",
    };
  }
  return {
    link: {
      reviewCourseId: external ? null : course.id,
      reviewExternalCourseId: course.external_course_id ?? null,
      reviewCourseName: course.name ?? course.id,
    },
  };
}

/** What saving a checked card sends: the scores, and the course and tees read off it. */
export function saveRequestFrom(userId: string, draft: ScanReviewDraft): SaveScanRequestDto {
  const { result, reviewCourseId, reviewExternalCourseId, reviewCourseName, editedTeeBox } = draft;
  const course = result.round.course;
  const courseName = reviewCourseName ?? course?.name ?? null;

  const link: Partial<SaveScanRequestDto> = reviewCourseId
    ? { course_id: reviewCourseId, ...(reviewExternalCourseId ? { external_course_id: reviewExternalCourseId } : {}) }
    : reviewExternalCourseId
      ? { external_course_id: reviewExternalCourseId, course_name: courseName }
      : { course_name: courseName };

  const teeBox = editedTeeBox?.toLowerCase();
  const tee = teeBox ? course?.tees?.find((t) => t.color?.toLowerCase() === teeBox) : undefined;
  const teeRatings: Partial<SaveScanRequestDto> = tee
    ? {
        tee_slope_rating: tee.slope_rating,
        tee_course_rating: tee.course_rating,
        tee_yardages: Object.keys(tee.hole_yardages).length > 0 ? tee.hole_yardages : undefined,
      }
    : {};

  return {
    user_id: userId,
    ...link,
    course_location: course?.location,
    tee_box: editedTeeBox,
    ...teeRatings,
    date: draft.editedDate,
    hole_scores: draft.editedScores.map((score, i) => ({
      hole_number: score.hole_number ?? i + 1,
      strokes: score.strokes,
      putts: score.putts,
      shots_to_green: score.shots_to_green,
      fairway_hit: score.fairway_hit,
      green_in_regulation: score.green_in_regulation,
    })),
    course_holes: course?.holes
      ?.filter((hole) => hole.number != null)
      .map((hole) => ({ hole_number: hole.number!, par: hole.par, handicap: hole.handicap })),
    all_tees: course?.tees
      ?.filter((t) => t.color)
      .map((t) => ({
        color: t.color!,
        slope_rating: t.slope_rating,
        course_rating: t.course_rating,
        hole_yardages: t.hole_yardages ?? {},
      })),
  };
}
