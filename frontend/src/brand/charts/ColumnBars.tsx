import { cn } from "@/brand/cn";

interface Column {
  key: string;
  /** How tall, against the tallest column or `max`. Zero draws a sliver, so the column still reads. */
  value: number;
  /** One of the few that matter: painted as a bogey rather than in quiet ink. */
  marked?: boolean;
  /** Printed under the column: a hole's handicap. */
  label?: string;
}

interface ColumnBarsProps {
  columns: Column[];
  /** The top of the scale; the tallest column when left off. */
  max?: number;
  /** What the columns show, for screen readers. */
  "aria-label": string;
  className?: string;
}

/**
 * A row of plain columns side by side, one a hole or a round, so the tall ones stand out: the
 * holes a golfer scores worst on, the rounds that bled three-putts. The marked ones are painted
 * red; the rest stay quiet. No axis: the card around it says what the height means.
 */
function ColumnBars({ columns, max, "aria-label": ariaLabel, className }: ColumnBarsProps) {
  const top = max ?? Math.max(0, ...columns.map((column) => column.value));
  const labelled = columns.some((column) => column.label != null);
  return (
    <div data-slot="column-bars" role="img" aria-label={ariaLabel} className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex h-columns items-end gap-1">
        {columns.map((column) => (
          <div
            key={column.key}
            className={cn(
              "min-h-1 flex-1 rounded-t-xs rounded-b-px",
              column.marked ? "bg-score-bogey-base" : "bg-input",
            )}
            style={{ height: `${top > 0 ? (Math.max(0, column.value) / top) * 100 : 0}%` }}
          />
        ))}
      </div>
      {labelled && (
        <div aria-hidden className="flex gap-1">
          {columns.map((column) => (
            <span key={column.key} className="flex-1 text-center text-meta text-muted-foreground">
              {column.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export { ColumnBars };
export type { Column, ColumnBarsProps };
