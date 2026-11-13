import { ChevronRight } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { CountBadge } from "./CountBadge";
import { SheetTitle } from "./Sheet";
import type { SideNavUser } from "./SideNav";
import { Avatar } from "./Avatar";

interface MoreMenuProps {
  items: NavItem[];
  /** The signed-in golfer, at the top of the sheet. */
  user?: SideNavUser;
  /** Names the sheet for screen readers. */
  title?: string;
  renderLink?: RenderLink;
  /** Runs when a link is taken, so the caller can close the sheet. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * What the phone's More sheet holds: the golfer on top, then the rest of the app's places in 52px
 * rows, each with its icon, a count when something waits there, and a chevron. `BottomNav` opens it
 * in a bottom `Sheet`, which brings the handle, the dim, the dialog role and the focus trap.
 */
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
            // One string for a screen reader, "Social, 2 new", rather than the label and the count apart.
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
