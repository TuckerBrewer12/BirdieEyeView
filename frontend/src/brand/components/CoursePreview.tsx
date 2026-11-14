import { ChevronRight } from "lucide-react";
import { cn } from "@/brand/cn";
import { RowButton } from "@/brand/components/Button";
import { TeeSwatch } from "@/brand/components/TeeSwatch";
import { formatCourseName, type CourseSummary } from "@/domain/course";
import { formatOneDecimal, pluralNoun, pluralize } from "@/domain/format";

interface CoursePreviewProps {
  course: CourseSummary;
  onClick?: () => void;
  focused?: boolean;
}

function TeeDots({ tees, className }: { tees: string[]; className?: string }) {
  if (tees.length === 0) return <span className={className} />;
  return (
    <span
      role="img"
      aria-label={`${pluralize(tees.length, "tee")}: ${tees.join(", ")}`}
      className={cn("flex items-center gap-0.5 lg:gap-1", className)}
    >
      {tees.map((tee) => (
        <TeeSwatch key={tee} color={tee} className="size-2.5 rounded-full lg:size-3.5" />
      ))}
    </span>
  );
}

export function CoursePreview({ course, onClick, focused = false }: CoursePreviewProps) {
  const name = formatCourseName(course.name);
  const { record } = course;
  const facts = [
    course.par != null ? `Par ${course.par}` : null,
    course.holeCount > 0 ? pluralize(course.holeCount, "hole") : null,
  ].filter(Boolean);

  return (
    <RowButton
      data-slot="course-preview"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3.5 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset lg:grid lg:grid-cols-course-row lg:gap-5 lg:px-5 lg:py-4",
        onClick ? "cursor-pointer hover:bg-muted/half" : "cursor-default",
        focused && "ring-2 ring-ring ring-inset",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 lg:gap-0.5">
        <span className="truncate text-body-lg font-semibold text-foreground">{name}</span>
        <span className="flex min-w-0 items-center gap-2 text-caption text-muted-foreground lg:text-body-sm">
          {(course.location || facts.length > 0) && (
            <span className="truncate">
              {course.location}
              {facts.length > 0 && (
                <span className="hidden lg:inline">
                  {course.location && " · "}
                  {facts.join(" · ")}
                </span>
              )}
            </span>
          )}
          <TeeDots tees={course.tees} className="shrink-0 lg:hidden" />
        </span>
      </span>

      <TeeDots tees={course.tees} className="hidden lg:flex" />

      <span className="flex shrink-0 flex-col items-end text-right">
        {record ? (
          <>
            <span className="text-body-lg font-bold text-foreground lg:text-body">
              {formatOneDecimal(record.scoringAverage)}
              <span className="hidden text-caption font-medium text-muted-foreground lg:inline"> avg</span>
            </span>
            <span className="text-meta text-muted-foreground lg:hidden">
              avg · {record.roundsPlayed} {pluralNoun(record.roundsPlayed, "rd")}
            </span>
            <span className="hidden text-caption text-muted-foreground lg:inline">
              {pluralize(record.roundsPlayed, "round")}
              {record.bestScore != null && ` · best ${record.bestScore}`}
            </span>
          </>
        ) : (
          <>
            <span className="text-body-lg font-bold text-foreground lg:hidden">—</span>
            <span className="text-meta text-muted-foreground lg:text-body-sm">
              Not played<span className="hidden lg:inline"> yet</span>
            </span>
          </>
        )}
      </span>

      <ChevronRight aria-hidden className="size-3 shrink-0 text-muted-foreground lg:size-3.5" />
    </RowButton>
  );
}
