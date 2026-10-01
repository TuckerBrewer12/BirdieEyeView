import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { teeSwatchClass, teeSwatchTextClass } from "@/lib/teeColor";

/** The tee's own color. Callers pass the tee name; this paints the chip. */
export function TeeSwatch({
  color,
  className,
  children,
}: {
  color: string | null;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cn(teeSwatchClass(color), teeSwatchTextClass(color), className)}>
      {children}
    </span>
  );
}
