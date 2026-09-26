import { ArrowLeft, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Collection,
  LoadingState,
  PageTitle,
  RoundPreview,
  SectionLabel,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { cn } from "@/brand/cn";
import { ScrollSection } from "@/components/analytics/ScrollSection";
import { CourseCharts, CourseScoreTrend } from "./CourseCharts";
import { NineTable } from "./NineTable";
import { useCourseDetailPageViewModel } from "./useCourseDetailPageViewModel";

export function CourseDetailPage({ userId }: { userId: string }) {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const viewModel = useCourseDetailPageViewModel(userId, courseId);

  if (viewModel.loading) {
    return <LoadingState>Loading course...</LoadingState>;
  }

  if (viewModel.loadError || !viewModel.hasCourse) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{viewModel.loadError ?? "Course not found."}</AlertDescription>
      </Alert>
    );
  }

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
      {viewModel.location && (
        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {viewModel.location}
        </div>
      )}
      <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
        {viewModel.headerStats.map((stat) => (
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

      {viewModel.activeTab === "course" && (
        <>
          {viewModel.teeChips.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-3">
              {viewModel.teeChips.map((chip) => (
                <Button
                  key={chip.color}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={chip.selected}
                  onClick={() => viewModel.selectTee(chip.color)}
                  className={cn(
                    "h-auto gap-2 px-3 py-2 text-xs text-muted-foreground",
                    chip.selected && "ring-2 ring-primary/30",
                  )}
                >
                  <span className={cn("size-3 shrink-0 rounded-full", chip.swatchClass, chip.swatchTextClass)} />
                  <span className="font-semibold capitalize text-foreground">{chip.color}</span>
                  {chip.rating && <span>{chip.rating}</span>}
                  {chip.slope && <span>{chip.slope}</span>}
                  {chip.yards && <span>{chip.yards}</span>}
                  {chip.courseHandicapLabel && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-caption font-semibold text-primary">
                      {chip.courseHandicapLabel}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}

          <Card className="overflow-x-auto py-0">
            <CardContent className="min-w-3xl px-0">
              <NineTable nine={viewModel.frontNine} />
              <div className="border-t-2 border-border" />
              <NineTable nine={viewModel.backNine} />
            </CardContent>
          </Card>
        </>
      )}

      {viewModel.activeTab === "performance" && (
        <ScrollSection>
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              {viewModel.heroStats.map((stat) => (
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
              <CourseScoreTrend data={viewModel.scoreTrend} theme={viewModel.chartTheme} />
            </div>

            <div>
              <SectionLabel>Round History</SectionLabel>
              <Collection
                layout="divided"
                className="overflow-hidden rounded-xl border border-border bg-card"
                items={viewModel.roundHistory}
                keyFor={(row, index) => row.id ?? `${row.date}-${index}`}
                empty="No rounds at this course."
                renderItem={(row) => (
                  <RoundPreview
                    variant="history"
                    date={row.date}
                    score={row.total_score}
                    toPar={row.to_par}
                    onClick={row.id ? () => navigate(`/rounds/${row.id}`) : undefined}
                  />
                )}
              />
            </div>

            <div>
              <SectionLabel>Hole-by-Hole Breakdown</SectionLabel>
              <CourseCharts
                charts={viewModel.charts}
                selectedCharts={viewModel.selectedCharts}
                chartTabs={viewModel.chartTabs}
                chartTab={viewModel.chartTab}
                onSelectChartTab={viewModel.selectChartTab}
                theme={viewModel.chartTheme}
              />
            </div>
          </div>
        </ScrollSection>
      )}
    </div>
  );
}
