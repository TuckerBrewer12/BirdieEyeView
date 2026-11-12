import type { ReactNode } from "react";
import { Card, toParTextClass, useFromBreakpoint } from "@/brand";
import { cn } from "@/brand/cn";
import { formatPercent } from "@/domain/format";
import type {
  AverageToPar,
  ScorecardHole,
  ScorecardNine,
  ScorecardTotals,
} from "../courseDetailModel";

interface CourseScorecardProps {
  /** The tee the card reads, as its bar names it. */
  teeLine: string | null;
  /** The front nine, then the back. */
  nines: ScorecardNine[];
  /** Adds the golfer's average to par, and on a wide screen their greens, under the course's rows. */
  played: boolean;
}

const LABEL = "pl-3 text-left text-label font-semibold whitespace-nowrap";
/** Out, In and Tot sit on the page's own tone, apart from the holes. */
const TOTAL = "bg-background p-0 text-center";

function show(value: number | null): string {
  return value == null ? "" : String(value);
}

function ToPar({ value }: { value: AverageToPar | null }) {
  return value ? (
    <span className={toParTextClass(value.value)}>{value.label}</span>
  ) : null;
}

interface RowProps {
  label: ReactNode;
  className: string;
  labelClassName?: string;
  /** Each nine with its own Out or In; a wide card adds the course's Tot after the back nine. */
  nines: ScorecardNine[];
  withTot: boolean;
  cell: (hole: ScorecardHole) => ReactNode;
  /** A nine's figure where it closes, or the course's under Tot. */
  total: (totals: ScorecardTotals, column: "Out" | "In" | "Tot") => ReactNode;
}

function Row({
  label,
  className,
  labelClassName,
  nines,
  withTot,
  cell,
  total,
}: RowProps) {
  return (
    <tr className={className}>
      <th scope="row" className={cn(LABEL, labelClassName)}>
        {label}
      </th>
      {nines.flatMap((nine) => [
        ...nine.holes.map((hole) => (
          <td key={hole.hole} className="p-0 text-center">
            {cell(hole)}
          </td>
        )),
        <td key={`${nine.side}-total`} className={TOTAL}>
          {total(nine.nine, nine.side === "front" ? "Out" : "In")}
        </td>,
      ])}
      {withTot && (
        <td className={TOTAL}>
          {nines[1]?.course && total(nines[1].course, "Tot")}
        </td>
      )}
    </tr>
  );
}

/** One table: every hole across with Out, In and Tot, or on a phone one nine closed by its own total. */
function Table({
  nines,
  played,
  wide,
}: {
  nines: ScorecardNine[];
  played: boolean;
  wide: boolean;
}) {
  const row = { nines, withTot: wide };
  const holes = nines.flatMap((nine) => nine.holes);
  // A row the card has nothing for reads as a failed read, so it stays out, as on a round's scorecard.
  const showYards = holes.some((hole) => hole.yards != null);
  const showHandicap = holes.some((hole) => hole.handicap != null);
  const small = "h-7 text-label font-medium text-muted-foreground";
  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col className={wide ? "w-19" : "w-14"} />
      </colgroup>
      <tbody className="divide-y divide-border border-b border-border">
        <Row
          {...row}
          label="Hole"
          className="h-8 bg-background text-label font-semibold text-foreground-secondary"
          cell={(hole) => hole.hole}
          total={(_, column) => column}
        />
        {showYards && (
          <Row
            {...row}
            label="Yards"
            className={cn(small, !wide && "text-caption")}
            cell={(hole) => show(hole.yards)}
            total={(totals) => show(totals.yards)}
          />
        )}
        <Row
          {...row}
          label="Par"
          className="h-9 text-body-sm font-semibold text-foreground"
          cell={(hole) => show(hole.par)}
          total={(totals) => (
            <span className="font-bold">{show(totals.par)}</span>
          )}
        />
        {showHandicap && (
          <Row
            {...row}
            label="Hcp"
            className={cn(small, !wide && "text-caption")}
            cell={(hole) => show(hole.handicap)}
            total={() => null}
          />
        )}
        {played && (
          <Row
            {...row}
            label={wide ? "Your avg" : "Avg"}
            className={cn(
              "h-9 font-bold",
              wide ? "text-label" : "text-caption"
            )}
            labelClassName="text-foreground"
            cell={(hole) => <ToPar value={hole.averageToPar} />}
            total={(totals) => <ToPar value={totals.averageToPar} />}
          />
        )}
        {played && wide && (
          <Row
            {...row}
            label="Greens"
            className="h-8 text-caption font-medium text-foreground-secondary"
            labelClassName="text-label"
            cell={(hole) =>
              hole.greens != null ? formatPercent(hole.greens) : ""
            }
            total={(totals) => (
              <span className="font-bold">
                {totals.greens != null ? formatPercent(totals.greens) : ""}
              </span>
            )}
          />
        )}
      </tbody>
    </table>
  );
}

/**
 * The course as a scorecard off one tee: its bar names the tee, then yards, par and stroke index for
 * every hole (yards and stroke index when the course has them), and once the golfer has played here their average to par on each hole and the greens
 * they hit. A phone stacks the front nine over the back, each closed by its own total.
 */
export function CourseScorecard({
  teeLine,
  nines,
  played,
}: CourseScorecardProps) {
  // Which tables to draw, not how they look: the phone's two nines are a different table.
  const wide = useFromBreakpoint("md");

  return (
    <Card data-slot="course-scorecard" className="gap-0 py-0">
      {teeLine && (
        <div className="flex min-h-10 items-center bg-primary px-3.5 py-2.5 text-label font-semibold text-primary-foreground md:min-h-11 md:px-5 md:text-body-sm dark:bg-accent dark:text-foreground">
          <span className="min-w-0 truncate">{teeLine}</span>
        </div>
      )}
      {wide ? (
        <div className="overflow-x-auto">
          <div className="min-w-scorecard-round px-3 pt-1 pb-2.5">
            <Table nines={nines} played={played} wide />
          </div>
        </div>
      ) : (
        <div className="pb-1">
          {nines.map((nine, i) => (
            <div key={nine.side}>
              {i > 0 && <div aria-hidden className="h-1.5 bg-background" />}
              <Table nines={[nine]} played={played} wide={false} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
