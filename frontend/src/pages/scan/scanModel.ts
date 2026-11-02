import { Round, isoDay, type HoleEdits } from "@/domain";
import type { CourseSummary } from "@/domain/course";
import type {
  CourseDto,
  SaveScanRequestDto,
  ScanDto,
  ScannedHoleScoreDto,
  ScannedTeeDto,
} from "@/types/api";

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

/** Which course a checked card is saved against. */
export type ReviewCourse =
  /** A saved course, or the course provider's (which has no id here until the round is saved). */
  | { status: "linked"; id: string | null; externalId: string | null; name: string }
  /** No link: the round keeps a name the golfer typed or kept. */
  | { status: "named"; name: string }
  /** Still choosing. Saved now, the round keeps the name read off the card, if there was one. */
  | { status: "picking"; name: string | null };

/** The card being checked before it is saved: the scan as read, and what the golfer changed. */
export interface ScanReviewDraft {
  /** The card as read, or the blank one hand entry opens. */
  scan: ScanDto;
  /** Strokes, putts and greens the golfer typed over, by hole number. */
  holes: HoleEdits;
  /** `YYYY-MM-DD`. */
  date: string;
  teeBox: string | null;
  course: ReviewCourse;
}

/** Today as `YYYY-MM-DD`, the date a round defaults to: the golfer's day, not UTC's. */
export function todayIso(now: Date = new Date()): string {
  return isoDay(now);
}

/** A course name as a search query: trimmed, single-spaced. */
export function courseQueryFrom(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ");
}

/** A finished scan, ready to check. */
export function reviewFromScan(result: ScanDto, today: string): ScanReviewDraft {
  const { round } = result;
  const onlyTee = round.course?.tees?.length === 1 ? round.course.tees[0].color : null;
  return {
    scan: result,
    holes: {},
    date: round.date ? round.date.substring(0, 10) : today,
    teeBox: round.tee_box ?? onlyTee ?? null,
    // A course name read off the card is often noisy, so it is kept but never linked.
    course: { status: "picking", name: round.course?.name ?? null },
  };
}

/** A blank card for typing scores in: the chosen course's holes, or eighteen unknown ones. */
export function reviewFromSetup(setup: ManualSetup, course: CourseDto | null): ScanReviewDraft {
  const holes = course?.holes.length
    ? course.holes.map((hole, i) => ({ number: hole.number ?? i + 1, par: hole.par, handicap: hole.handicap }))
    : Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: null, handicap: null }));
  const tees: ScannedTeeDto[] = (course?.tees ?? []).map((tee) => ({
    color: tee.color,
    slope_rating: tee.slope_rating,
    course_rating: tee.course_rating,
    hole_yardages: { ...tee.hole_yardages },
  }));
  const blankScores: ScannedHoleScoreDto[] = holes.map((hole) => ({
    hole_number: hole.number,
    strokes: null,
    putts: null,
    shots_to_green: null,
    fairway_hit: null,
    green_in_regulation: null,
  }));

  const scan: ScanDto = {
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

  const picked = setup.course;
  return {
    scan,
    holes: {},
    date: setup.date,
    teeBox: setup.teeBox || null,
    course: picked?.id
      ? { status: "linked", id: picked.id, externalId: null, name: picked.name }
      : picked
        ? { status: "named", name: picked.name }
        : { status: "picking", name: null },
  };
}

/** One hole's strokes, putts or green, as the golfer typed or tapped it. */
export function withHoleEdit(draft: ScanReviewDraft, hole: number, edit: HoleEdits[number]): ScanReviewDraft {
  return { ...draft, holes: { ...draft.holes, [hole]: { ...draft.holes[hole], ...edit } } };
}

/** A search result as the course to save the round against, or why it can't be. */
export function reviewCourseFrom(course: CourseSummary): { course: ReviewCourse } | { error: string } {
  const external = course.source === "external" || course.id.startsWith("external:");
  if (external && !course.externalId) {
    return {
      error: "External course result is missing provider ID. Please choose another match or enter a custom name.",
    };
  }
  return {
    course: {
      status: "linked",
      id: external ? null : course.id,
      externalId: course.externalId,
      name: course.name ?? course.id,
    },
  };
}

/**
 * The card as it will save: the scan with the golfer's edits, read against the linked course
 * once it has loaded, else against the course and tees the scan found.
 */
export function reviewedRound(draft: ScanReviewDraft, linkedCourse: CourseDto | null): Round {
  const { scan, holes, teeBox, course } = draft;
  const asRead = Round.fromScan({ ...scan.round, tee_box: teeBox });
  const played = Round.previewEdits(asRead, holes, linkedCourse, teeBox);
  return {
    ...played,
    date: draft.date,
    teeBox,
    course: {
      id: linkedCourse?.id ?? null,
      name: course.name,
      location: linkedCourse?.location ?? scan.round.course?.location ?? null,
      par: played.par,
    },
  };
}

/** What saving a checked card sends: the scores as edited, and the course and tees read off it. */
export function saveRequestFrom(userId: string, draft: ScanReviewDraft): SaveScanRequestDto {
  const { scan, course: picked, teeBox, holes } = draft;
  const course = scan.round.course;
  const courseName = picked.name ?? course?.name ?? null;

  const link: Partial<SaveScanRequestDto> =
    picked.status === "linked" && picked.id
      ? { course_id: picked.id, ...(picked.externalId ? { external_course_id: picked.externalId } : {}) }
      : picked.status === "linked" && picked.externalId
        ? { external_course_id: picked.externalId, course_name: courseName }
        : { course_name: courseName };

  const teeKey = teeBox?.toLowerCase();
  const tee = teeKey ? course?.tees?.find((t) => t.color?.toLowerCase() === teeKey) : undefined;
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
    tee_box: teeBox,
    ...teeRatings,
    date: draft.date,
    hole_scores: scan.round.hole_scores.map((score) => {
      const hole = score.hole_number;
      const edit = holes[hole];
      return {
        hole_number: hole,
        strokes: edit?.strokes !== undefined ? edit.strokes : score.strokes,
        putts: edit?.putts !== undefined ? edit.putts : score.putts,
        shots_to_green: score.shots_to_green,
        fairway_hit: score.fairway_hit,
        green_in_regulation: edit?.gir !== undefined ? edit.gir : score.green_in_regulation,
      };
    }),
    course_holes: course?.holes.map((hole) => ({ hole_number: hole.number, par: hole.par, handicap: hole.handicap })),
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
