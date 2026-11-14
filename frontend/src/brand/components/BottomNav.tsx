import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { MoreMenu } from "./MoreMenu";
import { Sheet, SheetContent, SheetTrigger } from "./Sheet";
import type { SideNavUser } from "./SideNav";

interface BottomNavProps {
  /** The tabs along the bar. Four, so with "More" five fit a phone. */
  tabs: NavItem[];
  /** The `href` of the tab raised in a filled circle, the one action the app is for. Put it mid-bar. */
  featuredHref?: string;
  /** Everything else, in a sheet the last tab opens. */
  moreItems?: NavItem[];
  moreLabel?: string;
  /** The signed-in golfer, at the top of the More sheet. */
  user?: SideNavUser;
  renderLink?: RenderLink;
  /** The nav landmark's name. */
  label?: string;
  className?: string;
}

const tabClass =
  "group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-meta font-medium text-muted-foreground transition-colors data-active:font-bold data-active:text-foreground data-panel-open:font-bold data-panel-open:text-foreground [&_svg]:size-5 [&_svg]:stroke-icon";

/** The icon's round holder: bare on a tab, a lifted filled disc on the featured one. */
const iconClass = "flex size-7 items-center justify-center rounded-full transition-colors";
const plainIconClass = "group-data-active:text-primary group-data-panel-open:text-primary";
const featuredIconClass = "-mt-3.5 size-11 bg-primary text-primary-foreground";

/**
 * The phone's tab bar: a few tabs and a "More" tab that opens a bottom sheet
 * of the rest (`MoreMenu`). One tab can be featured: its icon sits in a filled
 * disc raised above the bar. Taking a link closes the sheet, as does tapping
 * the dimmed page, dragging it down or pressing Escape. `AppShell` pins the
 * bar to the bottom edge.
 */
function BottomNav({
  tabs,
  featuredHref,
  moreItems = [],
  moreLabel = "More",
  user,
  renderLink,
  label = "Main",
  className,
}: BottomNavProps) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const moreActive = moreItems.some((item) => item.active);

  return (
    <nav aria-label={label} data-slot="bottom-nav" className={cn("relative", className)}>
      <div className="border-t border-border bg-card px-2 pb-safe-bottom">
        {/* `h-nav` is the measure `ActionBar` and the shell's padding take the bar's height from. */}
        <div className="flex h-nav items-stretch pt-1.5">
          {tabs.map((item) => (
            <NavLink key={item.href} item={item} renderLink={renderLink} className={tabClass}>
              <span className={cn(iconClass, item.href === featuredHref ? featuredIconClass : plainIconClass)}>
                <item.icon aria-hidden />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {moreItems.length > 0 && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                data-active={moreActive ? "" : undefined}
                data-panel-open={open ? "" : undefined}
                className={tabClass}
              >
                <span className={cn(iconClass, plainIconClass)}>
                  <Menu aria-hidden />
                </span>
                <span>{moreLabel}</span>
              </SheetTrigger>
              <SheetContent side="bottom" showCloseButton={false} data-slot="bottom-nav-menu">
                <MoreMenu items={moreItems} user={user} title={moreLabel} renderLink={renderLink} onNavigate={close} />
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  );
}

export { BottomNav };
export type { BottomNavProps };
