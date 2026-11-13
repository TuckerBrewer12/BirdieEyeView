import { CourseLinkSearch } from "@/brand";
import { formatCourseName } from "@/domain/course";
import type { ScanPageViewModel } from "../useScanPageViewModel";

export type PresetCourse = Pick<
  ScanPageViewModel,
  "courseSearch" | "presetCourse" | "pickPresetCourse" | "clearPresetCourse"
>;

/** A saved course to read the card against, picked before the scan: searched for, or picked and cleared. */
export function PresetCourseField({ course, inputId }: { course: PresetCourse; inputId?: string }) {
  const { courseSearch } = course;
  return (
    <CourseLinkSearch
      inputId={inputId}
      surface="plain"
      query={courseSearch.query}
      results={courseSearch.results}
      searching={courseSearch.searching}
      onQueryChange={courseSearch.setQuery}
      onSelectCourse={course.pickPresetCourse}
      onClose={courseSearch.reset}
      linkedName={course.presetCourse ? formatCourseName(course.presetCourse.name) : undefined}
      linkedTitle="Selected"
      onClear={course.clearPresetCourse}
      clearLabel="Clear course"
    />
  );
}
