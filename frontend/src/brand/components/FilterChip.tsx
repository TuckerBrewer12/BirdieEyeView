import * as React from "react";
import { cn } from "@/brand/cn";

interface FilterChipProps extends Omit<React.ComponentProps<"button">, "type"> {
  /** On: the filter is applied. */
  selected?: boolean;
  /** How many results the filter leaves, shown after the label. */
  count?: number;
  onSelectedChange?: (selected: boolean) => void;
}

/** A filter you switch on and off, with the number of results it leaves. */
function FilterChip({
  selected = false,
  count,
  onSelectedChange,
  onClick,
  className,
  children,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      data-slot="filter-chip"
      aria-pressed={selected}
      onClick={(event) => {
        onClick?.(event);
        onSelectedChange?.(!selected);
      }}
      className={cn(
        "group/chip inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-body font-medium whitespace-nowrap text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-pressed:border-primary/40 aria-pressed:bg-accent aria-pressed:text-primary aria-pressed:hover:bg-accent",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className="text-label font-semibold text-muted-foreground group-aria-pressed/chip:text-primary">
          {count}
        </span>
      )}
    </button>
  );
}

export { FilterChip };
export type { FilterChipProps };
