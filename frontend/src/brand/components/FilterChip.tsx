import type * as React from "react";
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

export { FilterChip };
export type { FilterChipProps };
