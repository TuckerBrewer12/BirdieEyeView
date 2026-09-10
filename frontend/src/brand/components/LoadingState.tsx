import * as React from "react";
import { cn } from "@/brand/cn";

/**
 * Fills the content area while a page has nothing to show yet.
 *
 * Not a dialog: there is nothing to interact with, nothing to dismiss, and no
 * focus to trap. It is a placeholder that occupies the space the page will
 * take, so the layout does not jump when the data lands.
 *
 * `role="status"` with a polite live region is the part that is easy to forget
 * when this gets written inline — a screen reader otherwise sits in silence
 * through the whole load and then announces nothing when the content appears.
 *
 * For a list inside an already-rendered page, use Collection's `loading`
 * instead; that keeps the page chrome on screen and only swaps the rows.
 */
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
