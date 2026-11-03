import { ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";

interface MoreMenuUser {
  name: string;
  /** Two letters for the avatar. */
  initials: string;
  /** The line under the name, such as a handicap or an email. */
  detail?: string;
}

interface MoreMenuProps {
  items: NavItem[];
  /** The signed-in golfer, shown at the top of the sheet. */
  user?: MoreMenuUser;
  /** Adds a sign-out row at the foot of the list. */
  onSignOut?: () => void;
  signingOut?: boolean;
  renderLink?: RenderLink;
  /** Runs when a link is taken, so the caller can fold the menu. */
  onNavigate?: () => void;
  /** The dialog's name. */
  label?: string;
  className?: string;
}

const rowClass =
  "flex min-h-13 w-full items-center gap-3.5 px-1 text-left text-base text-foreground transition-colors hover:text-primary data-active:font-semibold data-active:text-primary [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-icon";

const iconClass = "[&_svg]:text-foreground-secondary data-active:[&_svg]:text-primary";

/**
 * The phone's More menu: a sheet that rises from the foot of the screen with
 * the golfer on top and the rest of the app's places in a list of rows. It
 * paints only the sheet; `BottomNav` places it and dims the page behind it.
 */
function MoreMenu({
  items,
  user,
  onSignOut,
  signingOut = false,
  renderLink,
  onNavigate,
  label = "More",
  className,
}: MoreMenuProps) {
  return (
    <div
      data-slot="more-menu"
      role="dialog"
      aria-label={label}
      className={cn(
        "flex flex-col rounded-t-sheet bg-card px-4 pt-2.5 pb-8.5 text-card-foreground",
        className,
      )}
    >
      <div aria-hidden className="mb-2.5 h-1.25 w-9 self-center rounded-full bg-border-strong" />

      {user && (
        <div className="flex items-center gap-3 border-b border-chart-grid px-1 pt-1.5 pb-3.5">
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
          className={cn(rowClass, iconClass)}
        >
          <item.icon aria-hidden />
          <span className="flex-1">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-body-sm font-bold text-card">
              {item.badge}
            </span>
          )}
          <ChevronRight aria-hidden className="size-3.25! text-chart-reference!" />
        </NavLink>
      ))}

      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className={cn(rowClass, "text-destructive hover:text-destructive disabled:opacity-recessed")}
        >
          <LogOut aria-hidden />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      )}
    </div>
  );
}

export { MoreMenu };
export type { MoreMenuProps, MoreMenuUser };
