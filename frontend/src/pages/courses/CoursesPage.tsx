import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Card,
  Collection,
  CoursePreview,
  PageHeader,
  PageTitle,
  SearchField,
} from "@/brand";
import { pluralize } from "@/domain/format";
import { useCoursesPageViewModel } from "./useCoursesPageViewModel";

interface CoursesPageProps { userId: string; }

export function CoursesPage({ userId }: CoursesPageProps) {
  const navigate = useNavigate();
  const viewModel = useCoursesPageViewModel(userId);

  return (
    <div>
      <PageHeader title="Courses" subtitle={pluralize(viewModel.visibleCourses.length, "course")} revealAt={100} />

      <div className="flex flex-col gap-3.5 pb-6 md:gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3.5">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <PageTitle>Courses</PageTitle>
            <span data-slot="course-count" className="text-body-lg font-semibold text-muted-foreground">
              {viewModel.visibleCourses.length}
            </span>
          </div>
          <SearchField
            placeholder="Search courses"
            aria-label="Search courses"
            value={viewModel.search}
            onChange={viewModel.setSearch}
            loading={viewModel.loading}
            className="basis-full md:max-w-75 md:flex-1 md:basis-auto"
          />
        </div>

        {viewModel.error && (
          <Alert tone="danger">
            <AlertDescription>{viewModel.error}</AlertDescription>
          </Alert>
        )}

        <Card className="gap-0 py-0">
          <Collection
            layout="divided"
            items={viewModel.visibleCourses}
            keyFor={(course) => course.id}
            loading={viewModel.loading}
            loadingLabel="Loading courses..."
            empty={viewModel.showEmpty ? "No courses found." : undefined}
            renderItem={(course) => (
              <CoursePreview course={course} onClick={() => void navigate(`/courses/${course.id}`)} />
            )}
          />
        </Card>
      </div>
    </div>
  );
}
