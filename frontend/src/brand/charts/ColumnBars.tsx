import { cn } from "@/brand/cn";

interface Column {
  key: string;
  value: number;
  marked?: boolean;
  label?: string;
}

interface ColumnBarsProps {
  columns: Column[];
  max?: number;
  "aria-label": string;
  className?: string;
}

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
