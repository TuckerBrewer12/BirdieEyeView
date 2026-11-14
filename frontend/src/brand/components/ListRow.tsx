import type { ReactNode } from "react";
import { cn } from "@/brand/cn";

interface ListRowProps {
  slot?: string;
  size?: "default" | "sm";
  className?: string;
  children: ReactNode;
}

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
