import * as React from "react";
import { cn } from "@/brand/cn";

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
      <span className="text-label font-bold uppercase tracking-section text-primary/50">
        {children}
      </span>
    </div>
  );
}

export { SectionLabel };
