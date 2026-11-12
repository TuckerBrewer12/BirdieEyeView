import { ChevronLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collection,
  LoadingState,
  PageTitle,
  RoundPreview,
  TeePicker,
} from "@/brand";
import { recordFigures, teeLine } from "./courseDetailModel";
import { CourseRecordCard } from "./components/CourseRecordCard";
import { CourseScorecard } from "./components/CourseScorecard";
import { useCourseDetailPageViewModel } from "./useCourseDetailPageViewModel";

export function CourseDetailPage({ userId }: { userId: string }) {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const viewModel = useCourseDetailPageViewModel(userId, courseId);

  if (viewModel.loading) {
    return <LoadingState>Loading course...</LoadingState>;
  }

  const course = viewModel.course;
  if (viewModel.loadError || !course) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{viewModel.loadError ?? "Course not found."}</AlertDescription>
      </Alert>
    );
  }

  const courseLine =
    [course.location, course.par != null ? `Par ${course.par}` : null].filter(Boolean).join(" · ") || null;

  return (
    <div className="flex flex-col gap-3.5 pb-6 md:gap-4">
      <Button variant="outline" size="toolbar" className="self-start" onClick={() => void navigate("/courses")}>
        <ChevronLeft data-icon="inline-start" />
        Courses
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3.5">
        <div data-slot="course-title" className="min-w-0">
          <PageTitle size="heading">{viewModel.courseName}</PageTitle>
          {courseLine && (
            <div className="mt-0.5 text-body-sm text-muted-foreground md:mt-1 md:text-body">{courseLine}</div>
          )}
        </div>
        {viewModel.tees.length > 0 && (
          <TeePicker
            variant="segmented"
            tees={viewModel.tees}
            value={viewModel.tee?.color ?? ""}
            onChange={viewModel.selectTee}
          />
        )}
      </div>

      <CourseScorecard
        teeLine={viewModel.tee ? teeLine(viewModel.tee) : null}
        nines={viewModel.nines}
        played={viewModel.played}
      />

      {viewModel.played ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-course-record md:gap-4">
          <CourseRecordCard figures={viewModel.analytics ? recordFigures(viewModel.analytics) : []} />
          <Card data-slot="recent-rounds" className="gap-0 pt-4 pb-1 md:pb-2">
            <CardHeader className="px-4 md:px-5">
              <CardTitle level={2} className="text-body-lg font-semibold">
                Recent rounds
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Collection
                layout="divided"
                items={viewModel.recentRounds}
                keyFor={(round) => round.id}
                renderItem={(round) => (
                  <RoundPreview variant="history" round={round} onClick={() => void navigate(`/rounds/${round.id}`)} />
                )}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card data-slot="not-played" className="flex-row items-center justify-between gap-4 px-4 py-4 md:px-5">
          <span className="text-body text-foreground-secondary">You haven’t played here yet.</span>
          <Button onClick={() => void navigate("/scan")}>Scan a round</Button>
        </Card>
      )}
    </div>
  );
}
