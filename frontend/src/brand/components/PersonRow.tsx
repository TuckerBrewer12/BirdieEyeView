import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { ListRow } from "./ListRow";
import { Avatar } from "./Avatar";

interface PersonRowProps {
  name: string;
  /** Two letters for the avatar. Defaults to the first letters of the first two words of `name`. */
  initials?: string;
  /** The line under the name: a handicap and when they last played, an email, a date. */
  detail?: ReactNode;
  /** A quieter third line, such as when the row last changed. Makes the row taller than 64. */
  meta?: ReactNode;
  /** Buttons, a status or a chevron at the end of the row. */
  actions?: ReactNode;
  /** A row that's settled (a request answered): its avatar and words recede, its status doesn't. */
  settled?: boolean;
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
 * One person in a list: a quiet initials avatar, their name and a line or two about them, with
 * whatever can be done about them at the end. Built on `ListRow`, so it sits in a
 * `Collection layout="divided"`, which draws the rules between rows.
 */
function PersonRow({ name, initials, detail, meta, actions, settled = false, className }: PersonRowProps) {
  return (
    <ListRow slot="person-row" className={className}>
      <Avatar initials={initials ?? initialsOf(name)} className={cn(settled && "opacity-settled")} />

      <div className={cn("min-w-0 flex-1", settled && "opacity-settled")}>
        <p className="truncate text-body-lg font-semibold text-foreground">{name}</p>
        {detail != null && <p className="truncate text-body-sm text-muted-foreground">{detail}</p>}
        {meta != null && <p className="mt-0.5 truncate text-meta text-muted-foreground">{meta}</p>}
      </div>

      {actions != null && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </ListRow>
  );
}

export { PersonRow };
export type { PersonRowProps };
