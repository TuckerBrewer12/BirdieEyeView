import { ChevronRight } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { CountBadge } from "./CountBadge";
import { SheetTitle } from "./Sheet";
import type { SideNavUser } from "./SideNav";
import { Avatar } from "./Avatar";

interface MoreMenuProps {
  items: NavItem[];
  user?: SideNavUser;
  title?: string;
  renderLink?: RenderLink;
  onNavigate?: () => void;
  className?: string;
}

function MoreMenu({ items, user, title = "More", renderLink, onNavigate, className }: MoreMenuProps) {
  return (
    <div data-slot="more-menu" className={cn("flex flex-col px-1", className)}>
      <SheetTitle className="sr-only">{title}</SheetTitle>

      {user && (
        <div className="flex items-center gap-3 border-b border-border px-1 pt-1.5 pb-3.5">
          <Avatar initials={user.initials} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">{user.name}</p>
            {user.detail && <p className="truncate text-body text-muted-foreground">{user.detail}</p>}
          </div>
        </div>
      )}

      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          renderLink={renderLink}
          onClick={onNavigate}
          className="flex min-h-13 w-full items-center gap-3.5 px-1 text-left text-base text-foreground transition-colors hover:text-primary data-active:font-semibold data-active:text-primary"
        >
          <item.icon
            aria-hidden
            className="size-5 shrink-0 stroke-icon text-foreground-secondary in-data-active:text-primary"
          />
          {item.badge != null && item.badge > 0 ? (
            <span className="flex-1">
              <span aria-hidden>{item.label}</span>
              <span className="sr-only">{`${item.label}, ${item.badge} new`}</span>
            </span>
          ) : (
            <span className="flex-1">{item.label}</span>
          )}
          {item.badge != null && <CountBadge count={item.badge} />}
          <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </NavLink>
      ))}
    </div>
  );
}

export { MoreMenu };
export type { MoreMenuProps };
