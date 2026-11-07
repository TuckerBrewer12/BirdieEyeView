import * as React from "react";
import { cn } from "@/brand/cn";

/**
 * What a card, chart or page says when it has nothing to show yet: no rounds,
 * too few to draw a line. One padding and one type everywhere, the same as
 * Collection's `empty`, so an empty section reads alike on every screen.
 *
 * For a list, use Collection's `empty` instead; it keeps the list's chrome.
 */
function EmptyState({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state"
      className={cn("px-4 py-8 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { EmptyState };
