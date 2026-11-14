import * as React from "react";
import { cn } from "@/brand/cn";

/**
 * One quiet, centred line where content would be: "No rounds in the last 365 days." It keeps the
 * card's height so an empty card still reads as the same surface. Pass padding in `className`
 * for a taller gap (a whole page's).
 */
function EmptyNote({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-note"
      className={cn("px-4 py-8 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { EmptyNote };
