import type { ReactNode } from "react";
import { ListRow } from "./ListRow";

interface PersonRowProps {
  name: string;
  /** Two letters for the avatar. Defaults to the first letters of the first two words of `name`. */
  initials?: string;
  /** The line under the name: an email, a handicap. */
  detail?: ReactNode;
  /** A quieter third line, such as when the row last changed. Makes the row taller than 64. */
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
 * One person in a list: a brand-green initials avatar, their name and a line
 * or two about them, with whatever can be done about them at the end. Built to
 * sit in a `Collection layout="divided"`, which draws the rules between rows.
 */
function PersonRow({ name, initials, detail, meta, actions, className }: PersonRowProps) {
  return (
    <ListRow slot="person-row" className={className}>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-body font-bold text-primary-foreground"
      >
        {initials ?? initialsOf(name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body-lg font-semibold text-foreground">{name}</p>
        {detail != null && <p className="truncate text-body text-muted-foreground">{detail}</p>}
        {meta != null && <p className="mt-0.5 truncate text-meta text-muted-foreground">{meta}</p>}
      </div>

      {actions != null && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </ListRow>
  );
}

export { PersonRow };
export type { PersonRowProps };
