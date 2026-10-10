import { ArrowLeft, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  LoadingState,
  PageTitle,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { CoursePerformanceSection } from "./components/CoursePerformanceSection";
import { CourseScorecardSection } from "./components/CourseScorecardSection";
import { useCourseDetailPageViewModel } from "./useCourseDetailPageViewModel";

export function CourseDetailPage({ userId }: { userId: string }) {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const viewModel = useCourseDetailPageViewModel(userId, courseId);
  const { course } = viewModel;

  if (viewModel.loading) {
    return <LoadingState>Loading course...</LoadingState>;
  }

  if (viewModel.loadError || !course || !courseId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{viewModel.loadError ?? "Course not found."}</AlertDescription>
      </Alert>
    );
  }

  const headerStats = [
    { label: "Par", value: course.par ?? "—" },
    { label: "Holes", value: course.holes.length },
    { label: "Tees", value: course.tees.length },
  ];

  return (
    <div>
      <Button
        variant="linkMuted"
        size="xs"
        className="mb-4 h-auto gap-1.5 p-0 text-body"
        onClick={() => navigate("/courses")}
      >
        <ArrowLeft className="size-4" />
        Back to courses
      </Button>

      <PageTitle>{viewModel.courseName}</PageTitle>
      {course.location && (
        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {course.location}
        </div>
      )}
      <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
        {headerStats.map((stat) => (
          <span key={stat.label}>
            <span>{stat.label}</span>{" "}
            <span className="font-semibold text-foreground">{stat.value}</span>
          </span>
        ))}
      </div>

      <ToggleGroup
        variant="outline"
        spacing={2}
        value={[viewModel.activeTab]}
        onValueChange={(values) => viewModel.selectPageTab(values[0] ?? "")}
        className="my-6"
      >
        {viewModel.pageTabs.map((tab) => (
          <ToggleGroupItem key={tab.key} value={tab.key}>
            {tab.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {viewModel.activeTab === "course" && <CourseScorecardSection userId={userId} course={course} />}
      {viewModel.activeTab === "performance" && <CoursePerformanceSection userId={userId} courseId={courseId} />}
    </div>
  );
}
