import * as React from "react";
import { cn } from "@/brand/cn";

/**
 * A page's main actions. From `md` they sit in line where the page puts them (beside its title,
 * under a form); on a phone they pin to the bottom, just above the tab bar, over a glass strip, and
 * leave a gap of their own height in the page so nothing scrolls under them for good.
 *
 * A button that should take the phone's row gets `className="flex-1 md:flex-none"`.
 */
function ActionBar({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar"
      className={cn(
        "fixed inset-x-0 bottom-above-nav z-30 flex items-center gap-2 border-t border-border bg-background/glass px-page-phone py-3 backdrop-blur-xl",
        "md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ActionBar };
