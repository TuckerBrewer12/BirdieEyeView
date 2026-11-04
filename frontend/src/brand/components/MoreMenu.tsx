import { ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { Button } from "./Button";
import { SheetTitle } from "./Sheet";
import type { SideNavUser } from "./SideNav";

interface MoreMenuProps {
  items: NavItem[];
  /** The signed-in golfer, shown at the top of the sheet. */
  user?: SideNavUser;
  /** Names the sheet for screen readers. */
  title?: string;
  /** Adds a sign-out button at the foot of the list. */
  onSignOut?: () => void;
  signingOut?: boolean;
  renderLink?: RenderLink;
  /** Runs when a link is taken, so the caller can close the sheet. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * What the phone's More sheet holds: the golfer on top, the rest of the app's
 * places in 52px rows, and sign out. `BottomNav` opens it in a bottom `Sheet`,
 * which brings the handle, the dim, the dialog role and the focus trap.
 */
function MoreMenu({
  items,
  user,
  title = "More",
  onSignOut,
  signingOut = false,
  renderLink,
  onNavigate,
  className,
}: MoreMenuProps) {
  return (
    <div data-slot="more-menu" className={cn("flex flex-col px-1", className)}>
      <SheetTitle className="sr-only">{title}</SheetTitle>

      {user && (
        <div className="flex items-center gap-3 border-b border-border px-1 pt-1.5 pb-3.5">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold"
          >
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{user.name}</p>
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
          <span className="flex-1">{item.label}</span>
          <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </NavLink>
      ))}

      {onSignOut && (
        <Button variant="ghost" size="lg" className="mt-1 justify-start" disabled={signingOut} onClick={onSignOut}>
          <LogOut aria-hidden data-icon="inline-start" />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      )}
    </div>
  );
}

export { MoreMenu };
export type { MoreMenuProps };
