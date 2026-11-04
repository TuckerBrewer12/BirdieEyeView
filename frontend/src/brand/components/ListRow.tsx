import type { ReactNode } from "react";
import { cn } from "@/brand/cn";

/**
 * The shell of a list row: at least 64 tall, a leading mark, two lines, and
 * one value or action at the end. Built to sit in a `Collection
 * layout="divided"`, which draws the rules between rows.
 */
function ListRow({
  slot = "list-row",
  className,
  children,
}: {
  slot?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-slot={slot} className={cn("flex min-h-16 w-full items-center gap-3 py-2 pr-3 pl-4", className)}>
      {children}
    </div>
  );
}

export { ListRow };
