import { ChevronRight } from "lucide-react";
import { formatOneDecimal, pluralize } from "@/domain/format";
import { ListRow, type RowTarget } from "./ListRow";

interface CourseRowProps extends RowTarget {
  name: string;
  /** "Half Moon Bay, CA". Shown before the round count. */
  location?: string | null;
  rounds: number;
  /** The player's average score here. A dash when they have none. */
  average: number | null;
  className?: string;
}

/**
 * One course in a list: its name, where it is and how many rounds were played
 * there, with the player's average and a chevron at the end. The whole row
 * opens the course.
 */
function CourseRow({ name, location, rounds, average, className, ...target }: CourseRowProps) {
  const meta = [location, pluralize(rounds, "round")].filter(Boolean).join(" · ");

  return (
    <ListRow slot="course-row" className={className} {...target}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-lg font-semibold text-foreground">{name}</p>
        <p className="truncate text-body text-muted-foreground">{meta}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-body-lg font-bold text-foreground">{formatOneDecimal(average)}</p>
        <p className="text-body-sm text-muted-foreground">avg</p>
      </div>

      <ChevronRight aria-hidden className="size-3.5 shrink-0 text-chart-reference" />
    </ListRow>
  );
}

export { CourseRow };
export type { CourseRowProps };
