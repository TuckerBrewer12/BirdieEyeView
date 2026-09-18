import * as React from "react";
import { Flag } from "lucide-react";
import { cn } from "@/brand/cn";

/**
 * The logo lockup: the flag badge, and the wordmark beside it.
 *
 * The landing nav and both auth screens each had their own `Logo()` with the
 * same markup, so a change to the mark meant finding all three. `iconOnly`
 * drops the wordmark for places too narrow to carry it, and labels the badge
 * "BirdieEyeView" so the mark still has an accessible name.
 */
const SIZES = {
  default: { root: "gap-2.5", badge: "size-9 [&_svg]:size-4", word: "text-xl" },
  sm: { root: "gap-2", badge: "size-8 [&_svg]:size-3.5", word: "text-lg" },
} as const;

function BrandMark({
  className,
  size = "default",
  iconOnly = false,
  ...props
}: React.ComponentProps<"div"> & {
  size?: keyof typeof SIZES;
  iconOnly?: boolean;
}) {
  const sizing = SIZES[size];

  return (
    <div
      data-slot="brand-mark"
      className={cn("inline-flex items-center", sizing.root, className)}
      {...(iconOnly ? { role: "img" as const, "aria-label": "BirdieEyeView" } : {})}
      {...props}
    >
      <div
        data-slot="brand-mark-badge"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
          sizing.badge,
        )}
      >
        <Flag aria-hidden />
      </div>
      {!iconOnly && (
        <span
          data-slot="brand-mark-word"
          className={cn("font-bold tracking-title text-foreground", sizing.word)}
        >
          BirdieEyeView
        </span>
      )}
    </div>
  );
}

export { BrandMark };
