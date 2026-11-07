import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { MoreMenu } from "./MoreMenu";
import { Sheet, SheetContent, SheetTrigger } from "./Sheet";
import type { SideNavUser } from "./SideNav";

interface BottomNavProps {
  /** The tabs along the bar. Four fit a phone. */
  tabs: NavItem[];
  /** Everything else, in a menu the last tab opens. */
  moreItems?: NavItem[];
  moreLabel?: string;
  /** The golfer, shown at the top of the menu. */
  user?: SideNavUser;
  /** Adds a sign-out row to the menu. */
  onSignOut?: () => void;
  signingOut?: boolean;
  renderLink?: RenderLink;
  /** The nav landmark's name. */
  label?: string;
  className?: string;
}

const tabClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 text-meta font-semibold text-muted-foreground transition-colors data-active:text-primary data-popup-open:text-primary [&_svg]:size-5 [&_svg]:stroke-icon data-active:[&_svg]:stroke-icon-active data-popup-open:[&_svg]:stroke-icon-active";

/**
 * The phone's tab bar: a few tabs and a "More" tab that opens the rest in a
 * bottom `Sheet` over the page. Taking a link closes the sheet, as do tapping
 * the dimmed page and Escape. `AppShell` pins the bar to the bottom edge.
 */
function BottomNav({
  tabs,
  moreItems = [],
  moreLabel = "More",
  user,
  onSignOut,
  signingOut = false,
  renderLink,
  label = "Main",
  className,
}: BottomNavProps) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const moreActive = moreItems.some((item) => item.active);
  const hasMenu = moreItems.length > 0 || onSignOut != null;

  return (
    <nav aria-label={label} data-slot="bottom-nav" className={cn("relative", className)}>
      <div className="border-t border-border bg-card pb-safe-bottom">
        <div className="flex h-14 items-stretch">
          {tabs.map((item) => (
            <NavLink key={item.href} item={item} renderLink={renderLink} className={tabClass}>
              <item.icon aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {hasMenu && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger data-active={moreActive ? "" : undefined} className={tabClass}>
                <Menu aria-hidden />
                <span>{moreLabel}</span>
              </SheetTrigger>
              <SheetContent side="bottom" showCloseButton={false} data-slot="bottom-nav-menu">
                <MoreMenu
                  items={moreItems}
                  user={user}
                  title={moreLabel}
                  onSignOut={onSignOut}
                  signingOut={signingOut}
                  renderLink={renderLink}
                  onNavigate={close}
                />
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
