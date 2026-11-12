import { ScorecardCard, ScorecardGrid, ToParFigure, type ScorecardRow } from "@/brand";
import { formatPercent, formatScorecardFigure as show } from "@/domain/format";
import type { AverageToPar, ScorecardHole, ScorecardNine } from "../courseDetailModel";

interface CourseScorecardProps {
  /** The tee the card reads, as its bar names it. */
  teeLine: string | null;
  /** The front nine, then the back. */
  nines: ScorecardNine[];
  /** Adds the golfer's average to par, and on a wide screen their greens, under the course's rows. */
  played: boolean;
}

type Row = ScorecardRow<ScorecardHole, ScorecardNine>;

function ToPar({ value }: { value: AverageToPar | null }) {
  return <ToParFigure toPar={value?.value ?? null} label={value?.label} size="inherit" />;
}

const SMALL = "h-7 text-caption font-medium text-muted-foreground md:text-label";

/**
 * The course as a scorecard off one tee, on the kit's scorecard: yards, par and stroke index for
 * every hole (yards and stroke index when the course has them), and once the golfer has played here
 * their average to par on each hole and the greens they hit.
 */
export function CourseScorecard({ teeLine, nines, played }: CourseScorecardProps) {
  const holes = nines.flatMap((nine) => nine.holes);
  const course = nines[1]?.course ?? null;

  // A row the card has nothing for reads as a failed read, so it stays out, as on a round's card.
  const rows: (Row | false)[] = [
    holes.some((hole) => hole.yards != null) && {
      key: "yards",
      label: "Yards",
      className: SMALL,
      cell: (hole) => show(hole.yards),
      nine: (nine) => show(nine.nine.yards),
      tot: show(course?.yards),
    },
    {
      key: "par",
      label: "Par",
      className: "h-9 text-body-sm font-semibold text-foreground",
      cell: (hole) => show(hole.par),
      nine: (nine) => show(nine.nine.par),
      tot: show(course?.par),
      totalClassName: "font-bold",
    },
    holes.some((hole) => hole.handicap != null) && {
      key: "handicap",
      label: "Hcp",
      className: SMALL,
      cell: (hole) => show(hole.handicap),
    },
    played && {
      key: "average",
      label: "Avg",
      className: "h-9 text-caption font-bold md:text-label",
      labelClassName: "text-foreground",
      cell: (hole) => <ToPar value={hole.averageToPar} />,
      nine: (nine) => <ToPar value={nine.nine.averageToPar} />,
      tot: <ToPar value={course?.averageToPar ?? null} />,
    },
    // A phone's nine has no room for the greens; the wide card keeps them.
    played && {
      key: "greens",
      label: "Greens",
      wideOnly: true,
      className: "h-8 text-caption font-medium text-foreground-secondary",
      labelClassName: "text-label",
      cell: (hole) => (hole.greens != null ? formatPercent(hole.greens) : "-"),
      nine: (nine) => (nine.nine.greens != null ? formatPercent(nine.nine.greens) : "-"),
      tot: course?.greens != null ? formatPercent(course.greens) : "-",
      totalClassName: "font-bold",
    },
  ];
  const shown = rows.filter((row) => row !== false);

  return (
    <ScorecardCard data-slot="course-scorecard" bar={teeLine}>
      {(side) => (
        <ScorecardGrid
          nines={side ? nines.filter((nine) => nine.side === side) : nines}
          nineLabel={(nine) => (nine.side === "front" ? "Out" : "In")}
          withTot={side == null}
          rows={shown}
        />
      )}
    </ScorecardCard>
  );
}
