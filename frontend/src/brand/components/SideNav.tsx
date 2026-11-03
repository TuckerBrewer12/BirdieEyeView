import { LogOut } from "lucide-react";
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
  /** Icon links at the foot of the rail, beside the golfer — Settings. */
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
  "flex h-10 items-center gap-3 rounded-card px-3 text-sm font-medium text-sidebar-foreground/72 transition-colors duration-150 hover:bg-sidebar-foreground/8 hover:text-sidebar-foreground data-active:bg-sidebar-foreground/12 data-active:font-semibold data-active:text-sidebar-foreground [&_svg]:size-4.5 [&_svg]:shrink-0 [&_svg]:stroke-1.5";

const iconLinkClass =
  "flex size-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/72 transition-colors duration-150 hover:bg-sidebar-foreground/8 hover:text-sidebar-foreground data-active:bg-sidebar-foreground/12 data-active:text-sidebar-foreground [&_svg]:size-4.5 [&_svg]:stroke-1.5";

/**
 * The app's left rail: the brand at the top, the places to go, and the
 * signed-in golfer at the foot, with the secondary places (Settings) as icons
 * beside them. It fills its container; `AppShell` pins it to the left edge and
 * sets the width.
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
    <nav
      aria-label={label}
      data-slot="side-nav"
      className={cn(
        "flex size-full flex-col gap-1 bg-sidebar px-3.5 pt-5 pb-3.5 text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-2 pb-4.5">
        <span className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-sidebar-foreground text-sidebar-mark">
          <svg aria-hidden viewBox="0 0 16 16" className="size-4 fill-none">
            <path
              d="M4 14.5V2 L12.5 4.8 L4 7.6"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1 truncate text-brand">BirdieEyeView</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} renderLink={renderLink} className={linkClass}>
            <item.icon aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="mx-1 my-2 h-px bg-sidebar-foreground/10" />

      <div data-slot="side-nav-user" className="group flex items-center gap-2.5 pt-1.5 pr-1 pl-2">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-foreground/14 text-xs font-bold"
        >
          {user.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          {user.detail && (
            <p className="truncate text-xs text-sidebar-foreground/40">{user.detail}</p>
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
            className="text-sidebar-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:opacity-100 dark:hover:bg-sidebar-foreground/10"
          >
            <LogOut aria-hidden className="size-3.75" />
          </Button>
        )}
        {secondaryItems.map((item) => (
          <NavLink key={item.href} item={item} renderLink={renderLink} className={iconLinkClass}>
            <item.icon aria-hidden />
            <span className="sr-only">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export { SideNav };
export type { SideNavProps, SideNavUser };
