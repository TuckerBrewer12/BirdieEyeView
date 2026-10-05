import { useNavigate } from "react-router-dom";
import { Card, CardContent, Collection, Reveal, RoundPreview, SectionLabel } from "@/brand";
import { CourseScoreTrend } from "./CourseCharts";
import { CourseChartsSection } from "./CourseChartsSection";
import { useCoursePerformanceViewModel } from "./useCoursePerformanceViewModel";

interface CoursePerformanceSectionProps {
  userId: string;
  courseId: string;
}

const dash = (value: number | null) => (value == null ? "—" : String(value));

export function CoursePerformanceSection({ userId, courseId }: CoursePerformanceSectionProps) {
  const navigate = useNavigate();
  const viewModel = useCoursePerformanceViewModel(userId, courseId);
  const heroStats = [
    { label: "Rounds Played", value: String(viewModel.roundsPlayed) },
    { label: "Scoring Avg", value: viewModel.scoringAverage?.toFixed(1) ?? "—" },
    { label: "Best Round", value: dash(viewModel.bestScore) },
    { label: "Worst Round", value: dash(viewModel.worstScore) },
  ];

  return (
    <Reveal className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {heroStats.map((stat) => (
          <Card key={stat.label} size="sm" className="min-w-28 flex-1">
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <SectionLabel>Score Trend</SectionLabel>
        <CourseScoreTrend data={viewModel.trend} />
      </div>

      <div>
        <SectionLabel>Round History</SectionLabel>
        <Collection
          layout="divided"
          className="overflow-hidden rounded-xl border border-border bg-card"
          items={viewModel.rounds}
          keyFor={(round) => round.id}
          empty="No rounds at this course."
          renderItem={(round) => (
            <RoundPreview
              variant="history"
              round={round}
              onClick={() => navigate(`/rounds/${round.id}`)}
            />
          )}
        />
      </div>

      <CourseChartsSection userId={userId} courseId={courseId} />
    </Reveal>
  );
}
