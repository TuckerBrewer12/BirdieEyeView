import type { ReactNode } from "react";
import { cn } from "@/brand/cn";

/** A hole as the grid places it: by its number. */
export interface ScorecardGridHole {
  hole: number;
}

/** One nine as the grid draws it: its holes, closed by its own column (Out or In). */
export interface ScorecardGridNine<H extends ScorecardGridHole> {
  holes: readonly H[];
}

/** One row of a scorecard: its label, a cell per hole, and its figures where the nines and the card close. */
export interface ScorecardRow<H extends ScorecardGridHole, N extends ScorecardGridNine<H>> {
  key: string;
  label: ReactNode;
  /** The row's height and type, which its cells inherit. Style a phone's nine with the base class and `md:` for the wide card. */
  className?: string;
  labelClassName?: string;
  /** Left off a phone's nine, where there is no room for it: `hidden md:table-row`. */
  wideOnly?: boolean;
  cell: (hole: H) => ReactNode;
  /** Marks a hole's cell as one to check. */
  isCheck?: (hole: H) => boolean;
  /** The nine's figure under Out or In. Left out, the column is blank. */
  nine?: (nine: N) => ReactNode;
  /** The card's figure under Tot. */
  tot?: ReactNode;
  totalClassName?: string;
}

interface ScorecardGridProps<H extends ScorecardGridHole, N extends ScorecardGridNine<H>> {
  /** Left to right, each closed by its own column. */
  nines: readonly N[];
  /** The closing column's head for a nine: "Out", "In". */
  nineLabel: (nine: N) => string;
  /** Ends every row on the card's Tot, after the nines. A phone's single nine leaves it off. */
  withTot: boolean;
  rows: readonly ScorecardRow<H, N>[];
  className?: string;
}

/** The type every row's label shares. */
const LABEL = "pl-3 text-left text-label font-semibold whitespace-nowrap";
/** Out, In and Tot sit on the page's own tone, apart from the holes. */
const TOTAL = "bg-background p-0 text-center font-semibold";

/**
 * The scorecard's grid, one way for every card: a label column, a column per hole with a closing
 * column after each nine (Out, In) and, on the wide card, Tot. The Hole row heads it; the caller
 * passes the rows below, each with how to fill a hole's cell and its totals. A round's card and a
 * course's card both draw on it, so their columns, labels and totals read the same.
 *
 * A phone shows each nine as its own grid; how a row looks there is its base class, and on the wide
 * card its `md:` class.
 */
export function ScorecardGrid<H extends ScorecardGridHole, N extends ScorecardGridNine<H>>({
  nines,
  nineLabel,
  withTot,
  rows,
  className,
}: ScorecardGridProps<H, N>) {
  const total = (key: string, content: ReactNode, extra?: string) => (
    <td key={key} className={cn(TOTAL, extra)}>
      {content}
    </td>
  );

  return (
    <table data-slot="scorecard-grid" className={cn("w-full table-fixed border-collapse", className)}>
      <colgroup>
        <col className="w-14 md:w-18" />
        {nines.flatMap((nine, i) => [
          ...nine.holes.map((hole) => <col key={hole.hole} />),
          // A nine's total has room for its yardage.
          <col key={`total-${i}`} className="w-10" />,
        ])}
        {withTot && <col className="w-10" />}
      </colgroup>
      <tbody className="divide-y divide-border border-b border-border">
        <tr className="h-8 bg-background text-label font-semibold text-foreground-secondary">
          <th scope="row" className={LABEL}>
            Hole
          </th>
          {nines.flatMap((nine, i) => [
            ...nine.holes.map((hole) => (
              <td key={hole.hole} className="p-0 text-center">
                {hole.hole}
              </td>
            )),
            total(`nine-${i}`, nineLabel(nine)),
          ])}
          {withTot && total("tot", "Tot")}
        </tr>
        {rows.map((row) => (
          <tr key={row.key} className={cn(row.wideOnly && "hidden md:table-row", row.className)}>
            <th scope="row" className={cn(LABEL, row.labelClassName)}>
              {row.label}
            </th>
            {nines.flatMap((nine, i) => [
              ...nine.holes.map((hole) => (
                <td key={hole.hole} data-check={row.isCheck?.(hole) || undefined} className="p-0 text-center">
                  {row.cell(hole)}
                </td>
              )),
              total(`nine-${i}`, row.nine?.(nine), row.totalClassName),
            ])}
            {withTot && total("tot", row.tot, row.totalClassName)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
