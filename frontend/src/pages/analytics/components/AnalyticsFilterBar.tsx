import { X } from "lucide-react";
import { Button, SortControl, ToggleGroup, ToggleGroupItem } from "@/brand";
import { cn } from "@/brand/cn";
import type { AnalyticsFilters, PlayedCourse } from "../model";
import { LIMIT_OPTIONS, TIMEFRAME_OPTIONS, courseOptions } from "../present";

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
  playedCourses: PlayedCourse[];
  hasHomeCourse: boolean;
  className?: string;
}

/** How many rounds, over what stretch, at which course: the filters every figure below answers to. */
export function AnalyticsFilterBar({
  filters,
  onChange,
  playedCourses,
  hasHomeCourse,
  className,
}: AnalyticsFilterBarProps) {
  const courses = courseOptions(playedCourses, hasHomeCourse);
  const course = courses.find((option) => option.value === filters.courseId) ?? courses[0];

  return (
    <div data-slot="analytics-filter-bar" className={cn("flex flex-wrap items-center gap-3", className)}>
      <ToggleGroup
        aria-label="Rounds"
        size="sm"
        value={[String(filters.limit)]}
        onValueChange={(values) => {
          const next = LIMIT_OPTIONS.find((option) => String(option.value) === values[0]);
          if (next) onChange({ ...filters, limit: next.value });
        }}
      >
        {LIMIT_OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={String(option.value)}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ToggleGroup
        aria-label="Timeframe"
        size="sm"
        value={[filters.timeframe]}
        onValueChange={(values) => {
          const next = TIMEFRAME_OPTIONS.find((option) => option.value === values[0]);
          if (next) onChange({ ...filters, timeframe: next.value });
        }}
      >
        {TIMEFRAME_OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center gap-1">
        <SortControl
          aria-label="Course"
          label={course.label}
          value={course.value}
          options={courses}
          onChange={(courseId) => onChange({ ...filters, courseId })}
        />
        {filters.courseId !== "all" && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Clear course filter"
            onClick={() => onChange({ ...filters, courseId: "all" })}
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
