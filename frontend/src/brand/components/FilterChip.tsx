import type * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/brand/cn";
import { Toggle } from "./Toggle";

interface FilterChipProps extends Omit<React.ComponentProps<typeof Toggle>, "variant"> {
  /** How many results the filter leaves, shown after the label. */
  count?: number;
}

/** A filter you switch on and off, with the number of results it leaves. */
function FilterChip({ count, children, ...props }: FilterChipProps) {
  return (
    <Toggle variant="chip" {...props}>
      {children}
      {count !== undefined && (
        <span className="text-label font-semibold text-muted-foreground group-aria-pressed/toggle:text-primary">
          {count}
        </span>
      )}
    </Toggle>
  );
}

/**
 * A row of filter chips that pick one at a time, or none: pressing the chip
 * that is on turns it off. Arrow keys move between the chips.
 */
function FilterChipGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="filter-chip-group"
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

export { FilterChip, FilterChipGroup };
export type { FilterChipProps };
