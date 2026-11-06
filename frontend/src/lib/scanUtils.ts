import type { ExtractedHoleScore, ScoreMetadata, ScanResult } from "@/types/scan";
import { defaultMetadata } from "@/types/scan";

export type ScanWarningKey = "course_uncertain" | "back_nine_missing" | "player_row_misaligned" | "putts_not_found";

export interface ScanWarning {
  key: ScanWarningKey;
  label: string;
}

export function classifyScanWarnings(
  result: ScanResult,
  editedScores: ExtractedHoleScore[],
  puttsNotRecorded: boolean,
): ScanWarning[] {
  const warnings: ScanWarning[] = [];
  if (!result.round.course?.name && !result.round.course?.location)
    warnings.push({ key: "course_uncertain", label: "Scores are readable, course details are uncertain" });
  if (editedScores.slice(0, 9).some(s => s.strokes !== null) &&
      editedScores.slice(9).every(s => s.strokes === null))
    warnings.push({ key: "back_nine_missing", label: "Front nine detected, back nine missing" });
  if (result.fields_needing_review.some(f =>
      f.includes("Could not detect player score row") || f.startsWith("Row remap applied")))
    warnings.push({ key: "player_row_misaligned", label: "Player row may be misaligned" });
  if (puttsNotRecorded)
    warnings.push({ key: "putts_not_found", label: "Putts not found on card" });
  return warnings;
}

export interface ReviewItem {
  key: string;
  label: string;
  holeIndex: number | null;
}

export function buildReviewItems(result: ScanResult, editedScores: ExtractedHoleScore[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  const lowConfHoles = new Set(
    result.confidence.hole_scores
      .filter(h => ["low", "very_low"].includes(h.fields["strokes"]?.level ?? ""))
      .map(h => h.hole_number)
  );
  editedScores.forEach((s, i) => {
    if (s.strokes === null || lowConfHoles.has(s.hole_number ?? i + 1)) {
      items.push({ key: `hole-${s.hole_number}-strokes`, label: `Hole ${s.hole_number} score`, holeIndex: i });
    }
  });
  return items;
}

export interface CompletenessStats {
  scores: { complete: number; total: number };
  pars: { complete: number; total: number };
  putts: { complete: number; total: number } | null;
  courseLinked: boolean;
  courseName: string | null;
}

export function buildCompletenessStats(
  editedScores: ExtractedHoleScore[],
  result: ScanResult,
  reviewCourseId: string | null,
  reviewExternalCourseId: string | null,
  reviewCourseName: string | null,
  puttsNotRecorded: boolean,
): CompletenessStats {
  const holes = result.round.course?.holes ?? [];
  const parComplete = editedScores.filter(s =>
    holes.find(h => h.number === s.hole_number)?.par != null).length;
  return {
    scores: { complete: editedScores.filter(s => s.strokes !== null).length, total: editedScores.length },
    pars: { complete: parComplete, total: editedScores.length },
    putts: puttsNotRecorded ? null : { complete: editedScores.filter(s => s.putts !== null).length, total: editedScores.length },
    courseLinked: !!(reviewCourseId || reviewExternalCourseId),
    courseName: reviewCourseName,
  };
}

/**
 * Counts holes with missing strokes, excluding trailing nulls after the last played hole.
 * e.g. if player played 13 holes, holes 14-18 being null are not counted.
 */
export function countBadScanNulls(scores: ExtractedHoleScore[]): number {
  const lastNonNullIdx = scores.reduce((last, s, i) => (s.strokes !== null ? i : last), -1);
  if (lastNonNullIdx === -1) return 0;
  return scores.slice(0, lastNonNullIdx + 1).filter((s) => s.strokes === null).length;
}

/**
 * Auto-fills putts = 2 for holes that have a stroke score but no putts,
 * when at least some holes already have putts recorded.
 */
export function applyAutoFillPutts(
  scores: ExtractedHoleScore[],
  metadata: ScoreMetadata[],
  puttsNotRecorded: boolean
): { scores: ExtractedHoleScore[]; metadata: ScoreMetadata[] } {
  if (puttsNotRecorded) return { scores, metadata };
  const anyPutts = scores.some((s) => s.putts !== null);
  if (!anyPutts) return { scores, metadata };

  const nextScores = scores.map((s) => ({ ...s }));
  const nextMeta = metadata.map((m) => ({ ...m }));

  for (let i = 0; i < nextScores.length; i++) {
    if (nextScores[i].strokes !== null && nextScores[i].putts === null) {
      nextScores[i].putts = 2;
      nextMeta[i].putts_estimated = true;
    }
  }
  return { scores: nextScores, metadata: nextMeta };
}

/**
 * Auto-calculates GIR from strokes and putts when shots_to_green and gir are both unknown.
 * Formula: hit GIR if (strokes - putts) <= (par - 2)
 */
export function applyAutoCalcGir(
  scores: ExtractedHoleScore[],
  metadata: ScoreMetadata[],
  holeParMap: Map<number, number>
): { scores: ExtractedHoleScore[]; metadata: ScoreMetadata[] } {
  if (holeParMap.size === 0) return { scores, metadata };

  const nextScores = scores.map((s) => ({ ...s }));
  const nextMeta = metadata.map((m) => ({ ...m }));

  for (let i = 0; i < nextScores.length; i++) {
    const s = nextScores[i];
    if (
      s.green_in_regulation !== null ||
      s.shots_to_green !== null ||
      s.strokes === null ||
      s.putts === null
    ) continue;

    const holeNum = s.hole_number ?? i + 1;
    const par = holeParMap.get(holeNum);
    if (par == null) continue;

    nextScores[i].green_in_regulation = (s.strokes - s.putts) <= (par - 2);
    nextMeta[i].gir_calculated = true;
  }
  return { scores: nextScores, metadata: nextMeta };
}

/**
 * Builds initial scoreMetadata and applies auto-fill/auto-calc transformations.
 */
export function initializeScores(
  holeScores: ExtractedHoleScore[],
  fieldsNeedingReview: string[],
  courseHoles: { number: number | null; par: number | null }[]
): { editedScores: ExtractedHoleScore[]; scoreMetadata: ScoreMetadata[] } {
  const puttsNotRecorded = fieldsNeedingReview.some((f) => f.toLowerCase().includes("putts"));

  let scores = holeScores.map((s) => ({ ...s }));
  let metadata: ScoreMetadata[] = scores.map(() => defaultMetadata());

  const result1 = applyAutoFillPutts(scores, metadata, puttsNotRecorded);
  scores = result1.scores;
  metadata = result1.metadata;

  const holeParMap = new Map<number, number>();
  for (const h of courseHoles) {
    if (h.number != null && h.par != null) holeParMap.set(h.number, h.par);
  }

  const result2 = applyAutoCalcGir(scores, metadata, holeParMap);
  scores = result2.scores;
  metadata = result2.metadata;

  return { editedScores: scores, scoreMetadata: metadata };
}
