import { useNavigate } from "react-router-dom";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collection,
  Reveal,
  RoundPreview,
  SVGScoreHandicapTrend,
  SectionLabel,
  Stat,
  StatDelta,
  StatLabel,
  StatValue,
} from "@/brand";
import { formatOneDecimal } from "@/domain";
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
  const change = viewModel.recentAverageChange;
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
              <Stat>
                <StatValue>{stat.value}</StatValue>
                <StatLabel>{stat.label}</StatLabel>
              </Stat>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-slot="course-score-trend">
        <CardHeader>
          <CardTitle>Score trend</CardTitle>
          <CardDescription>Each round, with 5-round average</CardDescription>
          {viewModel.recentAverage != null && (
            <CardAction>
              <Stat align="end">
                <StatValue className="flex items-center gap-2">
                  {formatOneDecimal(viewModel.recentAverage)}
                  {change != null && change !== 0 && (
                    <StatDelta direction={change < 0 ? "down" : "up"}>{formatOneDecimal(Math.abs(change))}</StatDelta>
                  )}
                </StatValue>
                <StatLabel>{change != null ? "Avg, last 5 vs first 5" : "Avg, last 5"}</StatLabel>
              </Stat>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <SVGScoreHandicapTrend data={viewModel.trend} series="score" plain best={viewModel.bestScore} />
        </CardContent>
      </Card>

      <div>
        <SectionLabel>Round History</SectionLabel>
        <Card className="py-0">
          <Collection
            layout="divided"
            items={viewModel.rounds}
            keyFor={(round) => round.id}
            empty="No rounds at this course."
            renderItem={(round) => (
              <RoundPreview
                variant="history"
                round={round}
                onClick={() => void navigate(`/rounds/${round.id}`)}
              />
            )}
          />
        </Card>
      </div>

      <CourseChartsSection userId={userId} courseId={courseId} />
    </Reveal>
  );
}
