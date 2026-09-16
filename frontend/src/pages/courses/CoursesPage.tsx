import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Collection,
  CoursePreview,
  PageTitle,
  SearchField,
} from "@/brand";
import { PageHeader } from "@/components/layout/PageHeader";
import { CourseDetailPanel } from "@/components/course-detail/CourseDetailPanel";
import { useCoursesPageViewModel } from "./useCoursesPageViewModel";

interface CoursesPageProps { userId: string; }

export function CoursesPage({ userId }: CoursesPageProps) {
  const viewModel = useCoursesPageViewModel(userId);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  if (selectedCourseId) {
    return (
      <CourseDetailPanel
        courseId={selectedCourseId}
        userId={userId}
        onBack={() => setSelectedCourseId(null)}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Courses" subtitle={viewModel.headerSubtitle} scrollThreshold={100} />

      <div className="flex flex-col gap-2.5 pb-6">
        <PageTitle>Courses</PageTitle>

        <SearchField
          placeholder="Search courses..."
          value={viewModel.search}
          onChange={viewModel.setSearch}
          loading={viewModel.loading}
        />

        {viewModel.error && (
          <Alert variant="destructive">
            <AlertDescription>{viewModel.error}</AlertDescription>
          </Alert>
        )}

        <Collection
          layout="grid"
          items={viewModel.visibleCourses}
          keyFor={(course) => course.id}
          loading={viewModel.loading}
          loadingLabel="Loading courses..."
          empty={viewModel.showEmpty ? "No courses found." : undefined}
          renderItem={(course) => (
            <CoursePreview
              course={course}
              onClick={() => setSelectedCourseId(course.id)}
            />
          )}
        />
      </div>
    </div>
  );
}
