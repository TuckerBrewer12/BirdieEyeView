import { Button, Card, CardContent, TeeSwatch } from "@/brand";
import { cn } from "@/brand/cn";
import { formatCourseHandicap } from "@/domain/handicap";
import type { Course } from "@/types/golf";
import { NineTable } from "./NineTable";
import { useCourseScorecardViewModel } from "./useCourseScorecardViewModel";

interface CourseScorecardSectionProps {
  userId: string;
  course: Course;
}

export function CourseScorecardSection({ userId, course }: CourseScorecardSectionProps) {
  const viewModel = useCourseScorecardViewModel(userId, course);

  return (
    <>
      {viewModel.teeChips.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          {viewModel.teeChips.map(({ tee, selected, courseHandicap }) => (
            <Button
              key={tee.color}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={selected}
              onClick={() => viewModel.selectTee(tee.color ?? "")}
              className={cn(
                "h-auto gap-2 px-3 py-2 text-xs text-muted-foreground",
                selected && "ring-2 ring-primary/30",
              )}
            >
              <TeeSwatch color={tee.color} className="size-3 shrink-0 rounded-full" />
              <span className="font-semibold capitalize text-foreground">{tee.color}</span>
              {tee.course_rating != null && <span>Rating {tee.course_rating}</span>}
              {tee.slope_rating != null && <span>/ Slope {tee.slope_rating}</span>}
              {tee.total_yardage != null && <span>/ {tee.total_yardage} yds</span>}
              {courseHandicap != null && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-caption font-semibold text-primary">
                  CH {formatCourseHandicap(courseHandicap)}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}

      <Card className="overflow-x-auto py-0">
        <CardContent className="min-w-scorecard px-0">
          <NineTable nine={viewModel.frontNine} />
          <div className="border-t-2 border-border" />
          <NineTable nine={viewModel.backNine} />
        </CardContent>
      </Card>
    </>
  );
}
