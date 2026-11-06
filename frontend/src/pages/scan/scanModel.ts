import { Round, isoDay, type HoleEdits } from "@/domain";
import type { CourseSummary } from "@/domain/course";
import type {
  CourseDto,
  SaveScanRequestDto,
  ScanDto,
  ScannedHoleScoreDto,
  ScannedTeeDto,
} from "@/types/api";

export type ScanMode = "scan" | "manual";

export type ScanStep = "upload" | "processing" | "setup" | "review" | "success";

export const SCAN_PHASE_COUNT = 4;
export const SCAN_PHASE_HOLD_MS = 3500;

export interface PickedCourse {
  id: string | null;
  name: string;
}

export interface ManualSetup {
  course: PickedCourse | null;
  teeBox: string;
  date: string;
}

export type ReviewCourse =
  | { status: "linked"; id: string | null; externalId: string | null; name: string }
  | { status: "named"; name: string }
  | { status: "picking"; name: string | null };

export interface ScanReviewDraft {
  scan: ScanDto;
  holes: HoleEdits;
  date: string;
  teeBox: string | null;
  course: ReviewCourse;
}

export function todayIso(now: Date = new Date()): string {
  return isoDay(now);
}

export function courseQueryFrom(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ");
}

export function reviewFromScan(result: ScanDto, today: string): ScanReviewDraft {
  const { round } = result;
  const onlyTee = round.course?.tees?.length === 1 ? round.course.tees[0].color : null;
  return {
    scan: result,
    holes: {},
    date: round.date ? round.date.substring(0, 10) : today,
    teeBox: round.tee_box ?? onlyTee ?? null,
    course: { status: "picking", name: round.course?.name ?? null },
  };
}

export function reviewFromSetup(setup: ManualSetup, course: CourseDto | null): ScanReviewDraft {
  const holes = course != null && course.holes.length > 0
    ? course.holes.map((hole, i) => ({ number: hole.number ?? i + 1, par: hole.par, handicap: hole.handicap }))
    : Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: null, handicap: null }));
  const tees: ScannedTeeDto[] = (course?.tees ?? []).map((tee) => ({
    color: tee.color,
    slope_rating: tee.slope_rating,
    course_rating: tee.course_rating,
    hole_yardages: { ...tee.hole_yardages },
    course_handicap: tee.course_handicap,
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

export function withHoleEdit(draft: ScanReviewDraft, hole: number, edit: HoleEdits[number]): ScanReviewDraft {
  return { ...draft, holes: { ...draft.holes, [hole]: { ...draft.holes[hole], ...edit } } };
}

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
