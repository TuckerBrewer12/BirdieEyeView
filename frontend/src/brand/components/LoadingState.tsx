import * as React from "react";
import { cn } from "@/brand/cn";

function LoadingState({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="loading-state"
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-64 items-center justify-center text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { LoadingState };
