import { useState } from "react";
import { formatCourseName } from "@/domain/course";
import { messageFrom } from "@/lib/userFacingErrors";
import type { CourseDto } from "@/types/api";
import { coursesRepository, type CoursesRepository } from "../coursesRepository";
import { useCourse } from "../useCourse";
import { useCourseAnalytics } from "../useCourseAnalytics";
import { PAGE_TABS, type PageTabKey, type TabItem } from "./courseDetailModel";

export interface CourseDetailPageViewModel {
  loading: boolean;
  loadError: string | null;
  course: CourseDto | null;
  courseName: string;
  /** Course only, until the golfer has played here. Both when that couldn't be loaded, so the performance tab can say so. */
  pageTabs: TabItem<PageTabKey>[];
  activeTab: PageTabKey;
  selectPageTab: (key: string) => void;
}

/** The course page: which tab is showing. The scorecard and performance sections own the rest. */
export function useCourseDetailPageViewModel(
  userId: string,
  courseId: string | undefined,
  repository: CoursesRepository = coursesRepository,
): CourseDetailPageViewModel {
  const [activeTab, setActiveTab] = useState<PageTabKey>("course");
  const { data: course, isLoading: courseLoading, isError, error } = useCourse(courseId, repository);
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isFetched: analyticsFetched,
  } = useCourseAnalytics(userId, courseId, repository);
  // Fetched with no figures means the load failed. A refetch (a retry, or a section mounting
  // after the failure) keeps the page and its tabs up rather than looping back to loading.
  const offersPerformance = analytics ? analytics.roundsPlayed > 0 : analyticsFetched;

  return {
    loading: !!courseId && (courseLoading || (analyticsLoading && !analyticsFetched)),
    loadError: isError ? messageFrom(error, "Course not found.") : null,
    course: course ?? null,
    courseName: formatCourseName(course?.name),
    pageTabs: offersPerformance ? PAGE_TABS : PAGE_TABS.filter((tab) => tab.key === "course"),
    activeTab: offersPerformance ? activeTab : "course",
    selectPageTab: (key) => {
      if (key === "course" || key === "performance") setActiveTab(key);
    },
  };
}
