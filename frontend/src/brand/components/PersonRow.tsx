import type { ReactNode } from "react";
import { cn } from "@/brand/cn";

interface PersonRowProps {
  name: string;
  /** Two letters for the avatar. Defaults to the first letters of the first two words of `name`. */
  initials?: string;
  /** The line under the name — an email, a handle. */
  detail?: ReactNode;
  /** A quieter third line, such as when the row last changed. */
  meta?: ReactNode;
  /** Buttons or a status at the end of the row. */
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

/**
 * One person in a list: an initials avatar, their name and a line or two
 * about them, with whatever can be done about them at the end. Built to sit
 * in a `Collection layout="divided"`, which draws the rules between rows.
 */
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
