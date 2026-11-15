import type { LucideIcon } from "lucide-react";
import { cn } from "@/brand/cn";
import { scoreWashClass, type ScoreKey } from "@/brand/theme";

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
  tone: IconBadgeTone;
  className?: string;
}

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
