import type { ReactNode } from "react";
import { cn } from "@/brand/cn";

interface ListRowProps {
  /** The `data-slot` the row answers to: `person-row`, `settings-row`. */
  slot?: string;
  /** `default` is at least 64 tall, for a row with two lines; `sm` is 56, for a settings row of one. */
  size?: "default" | "sm";
  className?: string;
  children: ReactNode;
}

/**
 * The shell every list row is built on: a leading mark, a line or two, and one value or action at
 * the end, in a row at least 64 tall (56 for `sm`). It draws no rule: rows sit in a
 * `Collection layout="divided"` or a `SettingsGroup`, which draws the rules between them.
 */
function ListRow({ slot = "list-row", size = "default", className, children }: ListRowProps) {
  return (
    <div
      data-slot={slot}
      className={cn(
        "flex w-full items-center gap-3 pr-3 pl-4",
        size === "sm" ? "min-h-14 py-1.5" : "min-h-16 py-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { ListRow };
export type { ListRowProps };
