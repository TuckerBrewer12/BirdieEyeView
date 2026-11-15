import { useState } from "react";
import type { CourseAnalytics } from "@/domain/courseAnalytics";
import { formatCourseName } from "@/domain/course";
import type { HoleStats } from "@/domain/courseAnalytics";
import type { RoundSummary } from "@/domain/round";
import { averageLine, type AverageLine } from "@/domain/trend";
import { messageFrom } from "@/lib/userFacingErrors";
import type { CourseDto, TeeDto } from "@/types/api";
import { coursesRepository, type CoursesRepository } from "../coursesRepository";
import { useCourse } from "../useCourse";
import { useCourseAnalytics } from "../useCourseAnalytics";
import {
  COURSE_VIEWS,
  HOLE_ORDERS,
  RECENT_ROUNDS,
  holesInOrder,
  namedTees,
  nineFrom,
  selectedTee,
  type CourseView,
  type HoleOrder,
  type ScorecardNine,
} from "./courseDetailModel";

export interface CourseDetailPageViewModel {
  loading: boolean;
  loadError: string | null;
  recordError: string | null;
  retryRecord: () => void;
  course: CourseDto | null;
  courseName: string;
  tees: { name: string; yards: number | null }[];
  selectedTee: string | null;
  selectTee: (name: string) => void;
  tee: TeeDto | null;
  nines: ScorecardNine[];
  played: boolean;
  analytics: CourseAnalytics | null;
  recentRounds: RoundSummary[];
  view: CourseView;
  views: typeof COURSE_VIEWS;
  pickView: (view: string | undefined) => void;
  averageLine: AverageLine | null;
  courseHoles: HoleStats[];
  holes: HoleStats[];
  holeOrder: HoleOrder;
  holeOrders: typeof HOLE_ORDERS;
  pickHoleOrder: (order: string | undefined) => void;
}

export function useCourseDetailPageViewModel(
  userId: string,
  courseId: string | undefined,
  repository: CoursesRepository = coursesRepository,
): CourseDetailPageViewModel {
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<CourseView>("course");
  const [holeOrder, setHoleOrder] = useState<HoleOrder>("course");
  const { data: course, isLoading: courseLoading, isError, error } = useCourse(courseId, repository);
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: recordFailed,
    error: recordError,
    refetch: refetchRecord,
  } = useCourseAnalytics(userId, courseId, repository);
  const played = (analytics?.roundsPlayed ?? 0) > 0;
  const golfer: CourseAnalytics | null = played && analytics ? analytics : null;
  const tee = course ? selectedTee(course, picked) : null;

  return {
    loading: !!courseId && (courseLoading || analyticsLoading),
    loadError: isError ? messageFrom(error, "Course not found.") : null,
    recordError: recordFailed && !analytics ? messageFrom(recordError, "Could not load your rounds here.") : null,
    retryRecord: () => void refetchRecord(),
    course: course ?? null,
    courseName: formatCourseName(course?.name),
    tees: course ? namedTees(course).flatMap((t) => (t.color ? [{ name: t.color, yards: t.total_yardage }] : [])) : [],
    selectedTee: tee?.color ?? null,
    selectTee: setPicked,
    tee,
    nines: course ? [nineFrom(course, "front", tee, golfer), nineFrom(course, "back", tee, golfer)] : [],
    played,
    analytics: golfer,
    recentRounds: golfer ? golfer.rounds.slice(0, RECENT_ROUNDS) : [],
    view: played ? view : "course",
    views: COURSE_VIEWS,
    pickView: (next) => {
      const found = COURSE_VIEWS.find((option) => option.value === next);
      if (found) setView(found.value);
    },
    averageLine: averageLine(golfer?.scoringAverage ?? null),
    courseHoles: golfer?.holes ?? [],
    holes: holesInOrder(golfer?.holes ?? [], holeOrder),
    holeOrder,
    holeOrders: HOLE_ORDERS,
    pickHoleOrder: (next) => {
      const found = HOLE_ORDERS.find((option) => option.value === next);
      if (found) setHoleOrder(found.value);
    },
  };
}
