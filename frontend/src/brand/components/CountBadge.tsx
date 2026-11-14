import { cn } from "@/brand/cn";

interface CountBadgeProps {
  count: number;
  className?: string;
}

function CountBadge({ count, className }: CountBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      data-slot="count-badge"
      aria-hidden
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-label font-bold text-primary-foreground tabular-nums",
        className,
      )}
    >
      {count}
    </span>
  );
}

export { CountBadge };
export type { CountBadgeProps };
