import * as React from "react";
import { cn } from "@/brand/cn";

type ActionBarProps = React.ComponentProps<"div"> & {
  /**
   * `phone` (the default): in line where the page puts it from `md`, pinned above the tab bar on a
   * phone. `always`: pinned at every width, along the foot of the window beside the side rail from
   * `md`, for actions that only matter while something is pending, such as unsaved changes.
   */
  pinned?: "phone" | "always";
  /** For `always`: the width the actions line up to, the page's own (`max-w-2xl`). */
  contentClassName?: string;
};

/**
 * A page's main actions. From `md` they sit in line where the page puts them (beside its title,
 * under a form); on a phone they pin to the bottom, just above the tab bar, over a glass strip.
 * With `pinned="always"` they pin from `md` too, along the foot of the window. `AppShell` sees one
 * on the page and pads the page's end by the bar's height (`action-bar`), so nothing stays hidden
 * under it.
 *
 * A button that should take the phone's row gets `className="flex-1 md:flex-none"`.
 */
function ActionBar({ pinned = "phone", contentClassName, className, children, ...props }: ActionBarProps) {
  const always = pinned === "always";
  return (
    <div
      data-slot="action-bar"
      data-pinned={pinned}
      className={cn(
        "fixed inset-x-0 bottom-above-nav z-30 flex h-action-bar items-center gap-2 border-t border-border bg-background/glass px-page-phone backdrop-blur-xl",
        always
          ? "md:bottom-0 md:left-rail md:bg-card md:px-11 md:shadow-hairline"
          : "md:static md:z-auto md:h-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
      {...props}
    >
      {always ? (
        <div className={cn("flex w-full items-center gap-2", contentClassName)}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

export { ActionBar };
export type { ActionBarProps };
