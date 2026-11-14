import * as React from "react";
import { cn } from "@/brand/cn";

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
