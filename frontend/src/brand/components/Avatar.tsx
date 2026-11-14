import { cn } from "@/brand/cn";

interface AvatarProps {
  initials: string;
  size?: "sm" | "md";
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
