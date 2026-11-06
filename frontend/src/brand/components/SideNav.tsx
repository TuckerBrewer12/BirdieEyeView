import { ChevronsUpDown, Flag, LogOut } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { Button } from "./Button";

interface SideNavUser {
  name: string;
  /** Two letters for the avatar. */
  initials: string;
  /** The line under the name, such as an email. */
  detail?: string;
}

interface SideNavProps {
  items: NavItem[];
  /** Pinned at the foot of the rail, above the golfer — Settings. */
  secondaryItems?: NavItem[];
  user: SideNavUser;
  /** Shows a sign-out button on the golfer's row. */
  onSignOut?: () => void;
  signingOut?: boolean;
  renderLink?: RenderLink;
  /** The nav landmark's name. */
  label?: string;
  className?: string;
}

const linkClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/half transition-all duration-150 hover:bg-sidebar-foreground/faint hover:text-sidebar-foreground data-active:bg-sidebar-foreground/tint data-active:font-semibold data-active:text-sidebar-foreground [&_svg]:size-4.5 [&_svg]:shrink-0";

/**
 * The app's left rail: the brand at the top, the places to go, and the
 * signed-in golfer at the foot. It fills its container; `AppShell` pins it
 * to the left edge and sets the width.
 */
function SideNav({
  items,
  secondaryItems = [],
  user,
  onSignOut,
  signingOut = false,
  renderLink,
  label = "Main",
  className,
}: SideNavProps) {
  return (
    <div
      data-slot="side-nav"
      className={cn(
        "flex size-full flex-col bg-linear-to-b/srgb from-sidebar to-sidebar-end text-sidebar-foreground",
        className,
      )}
    >
      <div className="p-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-foreground/tint">
            <Flag aria-hidden className="size-3.5" />
          </span>
          <span className="flex-1 truncate text-sm font-semibold">BirdieEyeView</span>
          <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-sidebar-foreground/recessed" />
        </div>
      </div>

      <nav aria-label={label} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-0.5 p-3">
          {items.map((item) => (
            <NavLink key={item.href} item={item} renderLink={renderLink} className={linkClass}>
              <item.icon aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </div>
        {secondaryItems.length > 0 && (
          <div className="flex flex-col gap-0.5 px-3 pb-2">
            {secondaryItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                renderLink={renderLink}
                className={cn(linkClass, "[&_svg]:size-4.25")}
              >
                <item.icon aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-foreground/tint p-3">
        <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-sidebar-foreground/faint">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-foreground/tint text-xs font-bold"
          >
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            {user.detail && (
              <p className="truncate text-xs text-sidebar-foreground/recessed">{user.detail}</p>
            )}
          </div>
          {onSignOut && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onSignOut}
              disabled={signingOut}
              aria-label={signingOut ? "Signing out…" : "Sign out"}
              title="Sign out"
              className="text-sidebar-foreground/recessed opacity-0 transition-opacity group-hover:opacity-100 hover:bg-sidebar-foreground/tint hover:text-sidebar-foreground focus-visible:opacity-100 dark:hover:bg-sidebar-foreground/tint"
            >
              <LogOut aria-hidden className="size-3.75" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export { SideNav };
export type { SideNavProps, SideNavUser };
