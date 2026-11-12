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
  TeeSwatch,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
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

  if (viewModel.loadError || !viewModel.course) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{viewModel.loadError ?? "Course not found."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 pb-6 md:gap-4">
      <Button variant="outline" size="toolbar" className="self-start" onClick={() => void navigate("/courses")}>
        <ChevronLeft data-icon="inline-start" />
        Courses
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3.5">
        <div data-slot="course-title" className="min-w-0">
          <PageTitle size="heading">{viewModel.courseName}</PageTitle>
          {viewModel.courseLine && (
            <div className="mt-0.5 text-body-sm text-muted-foreground md:mt-1 md:text-body">{viewModel.courseLine}</div>
          )}
        </div>
        {viewModel.tees.length > 0 && (
          <ToggleGroup
            aria-label="Tee"
            value={viewModel.selectedTee ? [viewModel.selectedTee] : []}
            onValueChange={(values: string[]) => {
              if (values[0]) viewModel.selectTee(values[0]);
            }}
            className="w-full md:w-fit"
          >
            {viewModel.tees.map((tee) => (
              <ToggleGroupItem key={tee} value={tee} className="min-w-0 flex-1 basis-0 gap-1.5 md:flex-none md:basis-auto">
                <TeeSwatch color={tee} className="size-2.5 shrink-0 rounded-full" />
                <span className="truncate capitalize">{tee}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      <CourseScorecard teeLine={viewModel.teeLine} nines={viewModel.nines} played={viewModel.played} />

      {viewModel.played ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-course-record md:gap-4">
          <CourseRecordCard figures={viewModel.record} />
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
