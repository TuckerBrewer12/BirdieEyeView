import type { LucideIcon } from "lucide-react";
import { cn } from "@/brand/cn";
import { scoreWashClass, type ScoreKey } from "@/brand/theme";

/** A score kind's wash, the brand green, or the info blue. */
type IconBadgeTone = ScoreKey | "primary" | "info";

const OTHER_TONES: Record<"primary" | "info", string> = {
  primary: "bg-primary/tint text-primary",
  info: "bg-status-info/tint text-status-info",
};

function toneClass(tone: IconBadgeTone): string {
  return tone === "primary" || tone === "info" ? OTHER_TONES[tone] : scoreWashClass(tone);
}

interface IconBadgeProps {
  icon: LucideIcon;
  /** What the mark stands for: a score kind's colour (`birdie`), `primary` for greens, `info` for putts. */
  tone: IconBadgeTone;
  className?: string;
}

/** An icon on a round light wash in the colour of what it counts, leading a row: a record, a stat. Decoration. */
function IconBadge({ icon: Icon, tone, className }: IconBadgeProps) {
  return (
    <span
      aria-hidden
      data-slot="icon-badge"
      data-tone={tone}
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", toneClass(tone), className)}
    >
      <Icon className="size-4" />
    </span>
  );
}

export { IconBadge };
export type { IconBadgeProps, IconBadgeTone };
