import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./Collapsible";
import { MoreMenu } from "./MoreMenu";
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
  "flex flex-1 flex-col items-center justify-center gap-0.5 text-meta font-semibold text-muted-foreground transition-colors data-active:text-primary data-panel-open:text-primary [&_svg]:size-5 [&_svg]:stroke-icon data-active:[&_svg]:stroke-icon-active data-panel-open:[&_svg]:stroke-icon-active";

/**
 * The phone's tab bar: a few tabs and a "More" tab that opens a sheet of the
 * rest rising over the bar. Taking any link folds the menu, as does tapping the
 * dimmed page or pressing Escape. `AppShell` pins it to the bottom edge.
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

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<nav aria-label={label} />}
      data-slot="bottom-nav"
      className={cn("relative", className)}
    >
      {/* Below the dim and the sheet (z-20), so the open menu covers the bar. */}
      <div className="relative z-10 border-t border-border bg-card pb-safe-bottom">
        <div className="flex h-14 items-stretch">
          {tabs.map((item) => (
            <NavLink key={item.href} item={item} renderLink={renderLink} onClick={close} className={tabClass}>
              <item.icon aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {hasMenu && (
            <CollapsibleTrigger
              data-active={moreActive ? "" : undefined}
              className={tabClass}
            >
              <Menu aria-hidden />
              <span>{moreLabel}</span>
            </CollapsibleTrigger>
          )}
        </div>
      </div>

      {hasMenu && (
        <CollapsibleContent>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-20 bg-foreground/45 dark:bg-background/60"
          />
          {/* The sheet covers the bar: it rises from the screen's foot. */}
          <div data-slot="bottom-nav-menu" className="absolute inset-x-0 bottom-0 z-20">
            <MoreMenu
              items={moreItems}
              user={user}
              onSignOut={onSignOut}
              signingOut={signingOut}
              renderLink={renderLink}
              onNavigate={close}
            />
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export { BottomNav };
export type { BottomNavProps };
