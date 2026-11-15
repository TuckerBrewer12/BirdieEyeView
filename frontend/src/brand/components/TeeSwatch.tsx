import type { ReactNode } from "react";
import { extractTeeColorToken } from "@/domain/course";
import { cn } from "@/brand/cn";
import { teeSwatchVariants } from "./variants";

interface TeeSwatchProps {
  color: string | null;
  className?: string;
  children?: ReactNode;
}

function TeeSwatch({ color, className, children }: TeeSwatchProps) {
  const token = extractTeeColorToken(color);
  const tee = token == null || token === "combo" ? "none" : token;

  return (
    <span data-slot="tee-swatch" className={cn(teeSwatchVariants({ tee }), className)}>
      {children}
    </span>
  );
}

export { TeeSwatch };
