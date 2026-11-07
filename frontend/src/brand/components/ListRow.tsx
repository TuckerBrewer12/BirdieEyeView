import type { ReactNode } from "react";
import { cn } from "@/brand/cn";

const heights = {
  /** A person or a course: 64 tall. */
  default: "min-h-16",
  /** A settings row: 56 tall. */
  sm: "min-h-14",
};

/**
 * The shell of a list row: a leading mark or label, one or two lines, and one
 * value or action at the end. Built to sit in a `Collection layout="divided"`
 * (or a `SettingsGroup`), which draws the rules between rows.
 */
function ListRow({
  slot = "list-row",
  size = "default",
  className,
  children,
}: {
  slot?: string;
  size?: keyof typeof heights;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-slot={slot} className={cn("flex w-full items-center gap-3 py-2 pr-3 pl-4", heights[size], className)}>
      {children}
    </div>
  );
}

export { ListRow };
