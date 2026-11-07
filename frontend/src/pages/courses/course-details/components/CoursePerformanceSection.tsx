import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Collection,
  Reveal,
  RoundPreview,
  ScoreTrendChart,
  SectionLabel,
  StatTiles,
} from "@/brand";
import { formatOneDecimal } from "@/domain/format";
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
    { label: "Scoring Avg", value: formatOneDecimal(viewModel.scoringAverage) },
    { label: "Best Round", value: dash(viewModel.bestScore) },
    { label: "Worst Round", value: dash(viewModel.worstScore) },
  ];

  return (
    <Reveal className="space-y-8">
      <StatTiles tiles={heroStats} />

      <div>
        <SectionLabel>Score Trend</SectionLabel>
        <Card>
          <CardContent className="pt-6">
            <ScoreTrendChart rows={viewModel.trend} />
          </CardContent>
        </Card>
      </div>

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
