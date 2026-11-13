import * as React from "react";
import { cn } from "@/brand/cn";

/**
 * A page's main actions. From `md` they sit in line where the page puts them (beside its title,
 * under a form); on a phone they pin to the bottom, just above the tab bar, over a glass strip.
 * `AppShell` sees one on the page and pads the page's end by the bar's height (`action-bar`), so
 * nothing stays hidden under it.
 *
 * A button that should take the phone's row gets `className="flex-1 md:flex-none"`.
 */
function ActionBar({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar"
      className={cn(
        "fixed inset-x-0 bottom-above-nav z-30 flex h-action-bar items-center gap-2 border-t border-border bg-background/glass px-page-phone backdrop-blur-xl",
        "md:static md:z-auto md:h-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ActionBar };
