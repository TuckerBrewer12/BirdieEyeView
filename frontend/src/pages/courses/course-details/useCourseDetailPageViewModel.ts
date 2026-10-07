import { useState } from "react";
import { formatCourseName } from "@/lib/courseName";
import { messageFrom } from "@/lib/userFacingErrors";
import type { Course } from "@/types/golf";
import { coursesRepository, type CoursesRepository } from "../coursesRepository";
import { useCourse } from "../useCourse";
import { useCourseAnalytics } from "../useCourseAnalytics";
import { PAGE_TABS, type PageTabKey, type TabItem } from "./courseDetailModel";

export interface CourseDetailPageViewModel {
  loading: boolean;
  loadError: string | null;
  course: Course | null;
  courseName: string;
  /** Course only, until the golfer has played here. */
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
  const { data: analytics, isLoading: analyticsLoading } = useCourseAnalytics(userId, courseId, repository);
  const hasPlayed = (analytics?.rounds_played ?? 0) > 0;

  return {
    loading: !!courseId && (courseLoading || analyticsLoading),
    loadError: isError ? messageFrom(error, "Course not found.") : null,
    course: course ?? null,
    courseName: formatCourseName(course?.name),
    pageTabs: hasPlayed ? PAGE_TABS : PAGE_TABS.filter((tab) => tab.key === "course"),
    activeTab: hasPlayed ? activeTab : "course",
    selectPageTab: (key) => {
      if (key === "course" || key === "performance") setActiveTab(key);
    },
  };
}
