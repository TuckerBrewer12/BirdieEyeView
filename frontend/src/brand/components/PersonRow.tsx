import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { ListRow } from "./ListRow";
import { Avatar } from "./Avatar";

interface PersonRowProps {
  name: string;
  initials?: string;
  detail?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
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
