import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/brand/cn";
import { NavLink, type NavItem, type RenderLink } from "@/brand/nav";
import { MoreMenu } from "./MoreMenu";
import { Sheet, SheetContent, SheetTrigger } from "./Sheet";
import type { SideNavUser } from "./SideNav";

interface BottomNavProps {
  tabs: NavItem[];
  featuredHref?: string;
  moreItems?: NavItem[];
  moreLabel?: string;
  user?: SideNavUser;
  renderLink?: RenderLink;
  label?: string;
  className?: string;
}

const tabClass =
  "group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-meta font-medium text-muted-foreground transition-colors data-active:font-bold data-active:text-foreground data-panel-open:font-bold data-panel-open:text-foreground [&_svg]:size-5 [&_svg]:stroke-icon";

const iconClass = "flex size-7 items-center justify-center rounded-full transition-colors";
const plainIconClass = "group-data-active:text-primary group-data-panel-open:text-primary";
const featuredIconClass = "-mt-3.5 size-11 bg-primary text-primary-foreground";

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
