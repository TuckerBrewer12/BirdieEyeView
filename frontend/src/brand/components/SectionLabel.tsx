import * as React from "react";
import { cn } from "@/brand/cn";

/**
 * The eyebrow above a page section — a short rule, then a tracked label.
 *
 * Round detail, analytics, and course detail each wrote this inline and the
 * margin already drifted. This is the one place the type lives; callers that
 * still have their own copy can move onto it when they are next touched.
 */
function SectionLabel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-label"
      className={cn("mb-6 flex items-center gap-3", className)}
      {...props}
    >
      <div className="h-px w-8 rounded-full bg-primary/30" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/50">
        {children}
      </span>
    </div>
  );
}

export { SectionLabel };
