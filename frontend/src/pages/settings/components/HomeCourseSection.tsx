import { Card, CardContent, CardDescription, CardHeader, CardTitle, CourseLinkSearch } from "@/brand";
import type { CourseSummary } from "@/domain/course";
import type { HomeCourse } from "../model";

interface HomeCourseSectionProps {
  homeCourse: HomeCourse | null;
  query: string;
  results: CourseSummary[];
  searching: boolean;
  onQueryChange: (query: string) => void;
  onPick: (course: CourseSummary) => void;
  onClear: () => void;
}

export function HomeCourseSection({
  homeCourse,
  query,
  results,
  searching,
  onQueryChange,
  onPick,
  onClear,
}: HomeCourseSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Home course</CardTitle>
        <CardDescription>Sets which course your home-course records in analytics come from.</CardDescription>
      </CardHeader>
      <CardContent>
        <CourseLinkSearch
          query={query}
          results={results}
          searching={searching}
          onQueryChange={onQueryChange}
          onSelectCourse={onPick}
          onClose={onClear}
          linkedTitle="Selected"
          linkedName={homeCourse ? (homeCourse.name ?? "Unnamed course") : undefined}
          onClear={onClear}
          clearLabel="Remove home course"
        />
      </CardContent>
    </Card>
  );
}
