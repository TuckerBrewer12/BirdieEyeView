import type { ReactNode } from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { ListRow, type RowTarget } from "./ListRow";
import { personAvatarVariants } from "./variants";

type AvatarTone = NonNullable<VariantProps<typeof personAvatarVariants>["tone"]>;

const tones: readonly AvatarTone[] = ["primary", "info", "triple", "eagle", "danger"];

interface PersonRowProps extends RowTarget {
  name: string;
  /** Two letters for the avatar. Defaults to the first letters of the first two words of `name`. */
  initials?: string;
  /** The line under the name: an email, a handicap. */
  detail?: ReactNode;
  /** A quieter third line, such as when the row last changed. Makes the row taller than 64. */
  meta?: ReactNode;
  /** A link-styled word, buttons or a status at the end of the row. */
  actions?: ReactNode;
  /** The avatar's colour. Defaults to one picked from `name`, so a person keeps theirs. */
  tone?: AvatarTone;
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

function toneOf(name: string): AvatarTone {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % tones.length;
  return tones[hash];
}

/**
 * One person in a list: a coloured initials avatar, their name and a line
 * about them, with one value or action at the end. With `href` or `onClick`
 * the whole row is the target; a row that ends in buttons is not one, since
 * the buttons are the targets.
 */
function PersonRow({
  name,
  initials,
  detail,
  meta,
  actions,
  tone,
  className,
  ...target
}: PersonRowProps) {
  return (
    <ListRow slot="person-row" className={className} {...target}>
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-body font-bold",
          personAvatarVariants({ tone: tone ?? toneOf(name) }),
        )}
      >
        {initials ?? initialsOf(name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-row text-foreground">{name}</p>
        {detail != null && <p className="truncate text-body text-muted-foreground">{detail}</p>}
        {meta != null && <p className="mt-0.5 truncate text-meta text-muted-foreground">{meta}</p>}
      </div>

      {actions != null && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </ListRow>
  );
}

export { PersonRow };
export type { PersonRowProps, AvatarTone };
