import type { ReactNode } from "react";
import { extractTeeColorToken } from "@/domain/course";
import { cn } from "@/brand/cn";
import { teeSwatchVariants } from "./variants";

interface TeeSwatchProps {
  /** The tee's name as the course stores it ("Blue", "Back Gold"). */
  color: string | null;
  className?: string;
  children?: ReactNode;
}

/**
 * The tee's own colour, read from the colour word in its name. A name with no
 * colour in it, or a combo tee, gets a neutral chip. Callers size and shape it.
 */
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
