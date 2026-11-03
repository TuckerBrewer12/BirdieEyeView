import type { ReactNode } from "react";
import { cn } from "@/brand/cn";

interface PersonRowProps {
  name: string;
  initials?: string;
  detail?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");
  return letters.toUpperCase() || "?";
}

function PersonRow({ name, initials, detail, meta, actions, className }: PersonRowProps) {
  return (
    <div data-slot="person-row" className={cn("flex items-center gap-3 px-4 py-3", className)}>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
      >
        {initials ?? initialsOf(name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {detail != null && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
        {meta != null && <p className="mt-0.5 truncate text-meta text-muted-foreground">{meta}</p>}
      </div>

      {actions != null && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PersonRow };
export type { PersonRowProps };
