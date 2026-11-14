import { cn } from "@/brand/cn";

interface CountBadgeProps {
  /** How many are waiting. Nothing shows for 0. */
  count: number;
  className?: string;
}

/**
 * A small green pill with a count, beside a button's label: the requests waiting for an answer.
 * It is drawn for the eye; say the count in the button's own label for a screen reader.
 */
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
