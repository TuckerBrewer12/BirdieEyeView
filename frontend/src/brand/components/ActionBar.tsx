import * as React from "react";
import { cn } from "@/brand/cn";

type ActionBarProps = React.ComponentProps<"div"> & {
  pinned?: "phone" | "always";
  contentClassName?: string;
};

function ActionBar({ pinned = "phone", contentClassName, className, children, ...props }: ActionBarProps) {
  const always = pinned === "always";
  return (
    <div
      data-slot="action-bar"
      data-pinned={pinned}
      className={cn(
        "fixed inset-x-0 bottom-above-nav z-30 flex h-action-bar items-center gap-2 border-t border-border bg-background/glass px-page-phone backdrop-blur-xl",
        always
          ? "md:bottom-0 md:left-rail md:bg-card md:px-page md:shadow-hairline"
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
