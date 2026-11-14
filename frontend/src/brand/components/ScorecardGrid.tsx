import type { ReactNode } from "react";
import { cn } from "@/brand/cn";

export interface ScorecardGridHole {
  hole: number;
}

export interface ScorecardGridNine<H extends ScorecardGridHole> {
  holes: readonly H[];
}

export interface ScorecardRow<H extends ScorecardGridHole, N extends ScorecardGridNine<H>> {
  key: string;
  label: ReactNode;
  className?: string;
  labelClassName?: string;
  wideOnly?: boolean;
  cell: (hole: H) => ReactNode;
  isCheck?: (hole: H) => boolean;
  nine?: (nine: N) => ReactNode;
  tot?: ReactNode;
  totalClassName?: string;
}

interface ScorecardGridProps<H extends ScorecardGridHole, N extends ScorecardGridNine<H>> {
  nines: readonly N[];
  nineLabel: (nine: N) => string;
  withTot: boolean;
  rows: readonly ScorecardRow<H, N>[];
  className?: string;
}

const LABEL = "pl-3 text-left text-label font-semibold whitespace-nowrap";
const TOTAL = "bg-background p-0 text-center font-semibold";

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
