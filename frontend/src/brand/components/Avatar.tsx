import { cn } from "@/brand/cn";

interface AvatarProps {
  /** The letters inside, already worked out: "AL". */
  initials: string;
  /** `sm` (32px) in the side rail, `md` (40px) in a list or a menu's header. */
  size?: "sm" | "md";
  /** `muted` on a card or sheet; `rail` on the green side rail, in the rail's own ink. */
  tone?: "muted" | "rail";
  className?: string;
}

const sizeClass = {
  sm: "size-8 text-xs",
  md: "size-10 text-body",
} as const;

const toneClass = {
  muted: "bg-muted text-foreground",
  rail: "bg-sidebar-foreground/tint",
} as const;

/**
 * A person's initials in a circle. It is drawn for the eye: the name beside it is what a screen
 * reader reads.
 */
function Avatar({ initials, size = "md", tone = "muted", className }: AvatarProps) {
  return (
    <span
      data-slot="avatar"
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        sizeClass[size],
        toneClass[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}

export { Avatar };
export type { AvatarProps };
