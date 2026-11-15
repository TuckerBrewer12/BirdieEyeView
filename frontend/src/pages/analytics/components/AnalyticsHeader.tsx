import { PageTitle, PickerMenu } from "@/brand";
import type { AnalyticsPageViewModel } from "../useAnalyticsPageViewModel";
import { LIMIT_OPTIONS, courseOptions, roundCountLabel } from "../present";

interface AnalyticsHeaderProps {
  vm: AnalyticsPageViewModel;
  roundCount: number | null;
}

export function AnalyticsHeader({ vm, roundCount }: AnalyticsHeaderProps) {
  const courses = courseOptions(vm.playedCourses, vm.hasHomeCourse);
  const course = courses.find((option) => option.value === vm.filters.courseId) ?? courses[0];
  const limit = LIMIT_OPTIONS.find((option) => option.value === String(vm.filters.limit)) ?? LIMIT_OPTIONS[2];

  return (
    <div data-slot="analytics-header" className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-baseline gap-2.5">
        <PageTitle>Analytics</PageTitle>
        {roundCount != null && (
          <span data-slot="round-count" className="text-body-lg font-semibold text-muted-foreground md:hidden">
            {roundCountLabel(roundCount)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {roundCount != null && (
          <span className="mr-1 hidden text-body text-muted-foreground md:inline">{roundCountLabel(roundCount)}</span>
        )}
        <PickerMenu
          aria-label="Rounds"
          label={limit.label}
          value={limit.value}
          options={LIMIT_OPTIONS}
          onChange={(value) => vm.setLimit(Number(value))}
          fill
          className="md:flex-none"
        />
        <PickerMenu
          aria-label="Course"
          label={course.label}
          value={course.value}
          options={courses}
          onChange={vm.setCourse}
          fill
          className="md:flex-none"
        />
      </div>
    </div>
  );
}
