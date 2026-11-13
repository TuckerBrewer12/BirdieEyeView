import { Card, CardContent, CardDescription, CardHeader, CardTitle, CourseLinkSearch } from "@/brand";
import { courseLabel, type CourseSummary } from "@/domain/course";
import type { HomeCourse } from "../model";

interface HomeCourseSectionProps {
  /** The picked course; null shows the search. */
  homeCourse: HomeCourse | null;
  query: string;
  results: CourseSummary[];
  searching: boolean;
  onQueryChange: (query: string) => void;
  onPick: (course: CourseSummary) => void;
  onClear: () => void;
}

/** Which course counts as home. Pick one from a search, or remove it. */
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
          linkedName={homeCourse ? courseLabel(homeCourse.name) : undefined}
          onClear={onClear}
          clearLabel="Remove home course"
        />
      </CardContent>
    </Card>
  );
}
