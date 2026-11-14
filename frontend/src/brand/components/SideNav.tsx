import { FlagTriangleRight, LogOut } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { Button } from "./Button";
import { Avatar } from "./Avatar";

interface SideNavUser {
  name: string;
  initials: string;
  detail?: string;
}

interface SideNavProps {
  items: NavItem[];
  secondaryItems?: NavItem[];
  user: SideNavUser;
  onSignOut?: () => void;
  signingOut?: boolean;
  renderLink?: RenderLink;
  label?: string;
  className?: string;
}

const linkStates =
  "text-sidebar-foreground/strong transition-colors duration-150 hover:bg-sidebar-foreground/faint hover:text-sidebar-foreground data-active:bg-sidebar-foreground/tint data-active:text-sidebar-foreground [&_svg]:size-icon-md [&_svg]:shrink-0 [&_svg]:stroke-icon";

const linkClass = cn(
  "flex h-10 items-center gap-3 rounded-card px-3 text-sm font-medium data-active:font-semibold",
  linkStates,
);

const iconLinkClass = cn("flex size-9 shrink-0 items-center justify-center rounded-lg", linkStates);

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
      <div className="flex items-center gap-2.5 px-2 pb-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-foreground text-sidebar">
          <FlagTriangleRight aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-body-lg font-bold tracking-name">BirdieEyeView</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} renderLink={renderLink} className={linkClass}>
            <item.icon aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="mx-1 my-2 h-px bg-sidebar-foreground/tint" />

      <div className="group flex items-center gap-2.5 pt-1.5 pr-1 pl-2">
        <Avatar initials={user.initials} size="sm" tone="rail" />
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
            <LogOut aria-hidden className="size-4" />
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
