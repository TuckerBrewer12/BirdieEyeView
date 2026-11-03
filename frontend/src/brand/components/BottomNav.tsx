import * as React from "react";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { Button } from "./Button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./Collapsible";

interface BottomNavProps {
  /** The tabs along the bar. Four, so with "More" five fit a phone. */
  tabs: NavItem[];
  /** The `href` of the tab raised in a filled circle, the one action the app is for. Put it mid-bar. */
  featuredHref?: string;
  /** Everything else, in a menu the last tab opens. */
  moreItems?: NavItem[];
  moreLabel?: string;
  /** Adds a sign-out row to the menu. */
  onSignOut?: () => void;
  signingOut?: boolean;
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
 * The phone's tab bar: a few tabs and a "More" tab that opens a menu of the
 * rest above the bar. One tab can be featured: its icon sits in a filled disc
 * raised above the bar. Taking any link folds the menu, as does tapping the
 * dimmed page or pressing Escape. `AppShell` pins it to the bottom edge.
 */
function BottomNav({
  tabs,
  featuredHref,
  moreItems = [],
  moreLabel = "More",
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
      {/* Raised so the bar stays clear of the dimmed page while the menu is open. */}
      <div className="relative z-10 border-t border-border bg-card px-2 pt-1.5 pb-safe-bottom">
        <div className="flex h-14 items-stretch">
          {tabs.map((item) => (
            <NavLink key={item.href} item={item} renderLink={renderLink} onClick={close} className={tabClass}>
              <span className={cn(iconClass, item.href === featuredHref ? featuredIconClass : plainIconClass)}>
                <item.icon aria-hidden />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {hasMenu && (
            <CollapsibleTrigger
              data-active={moreActive ? "" : undefined}
              className={tabClass}
            >
              <span className={cn(iconClass, plainIconClass)}>
                <Menu aria-hidden />
              </span>
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
            className="fixed inset-0 bg-foreground/20 dark:bg-background/60"
          />
          <div
            data-slot="bottom-nav-menu"
            className="absolute inset-x-3 bottom-full mb-3 rounded-2xl border border-border bg-card/95 shadow-card backdrop-blur-sm"
          >
            <p className="px-4 pt-4 pb-2 text-xs font-bold tracking-section text-muted-foreground uppercase">
              {moreLabel}
            </p>
            {moreItems.length > 0 && (
              <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    renderLink={renderLink}
                    onClick={close}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-active:bg-accent data-active:font-semibold data-active:text-primary [&_svg]:size-4"
                  >
                    <item.icon aria-hidden />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
            {onSignOut && (
              <div className="px-2 pb-3">
                <Button
                  variant="ghost"
                  onClick={onSignOut}
                  disabled={signingOut}
                  className="h-auto w-full justify-start gap-2 rounded-xl px-3 py-2.5 font-normal text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
                >
                  <LogOut aria-hidden />
                  {signingOut ? "Signing out…" : "Sign out"}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export { BottomNav };
export type { BottomNavProps };
