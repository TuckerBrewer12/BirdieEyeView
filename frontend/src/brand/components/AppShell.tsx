import type * as React from "react";
import { cn } from "@/brand/cn";

interface AppShellProps extends React.ComponentProps<"div"> {
  /** Pinned down the left edge from `md` up — a `SideNav`. */
  sideNav?: React.ReactNode;
  /** Pinned to the bottom of the screen below `md` — a `BottomNav`. */
  bottomNav?: React.ReactNode;
}

/**
 * The signed-in app's frame: a side rail on wide screens, a tab bar on
 * phones, and the page between them. The shell only places the pieces; the
 * caller hands in navs that already know the route and the golfer.
 */
function AppShell({ sideNav, bottomNav, className, children, ...props }: AppShellProps) {
  return (
    <div data-slot="app-shell" className={cn("min-h-screen", className)} {...props}>
      {sideNav != null && (
        <div data-slot="app-shell-side" className="fixed inset-y-0 left-0 z-30 hidden w-rail md:block">
          {sideNav}
        </div>
      )}
      {/* The padding clears the tab bar on phones and the rail on wide screens. */}
      <main data-slot="app-shell-main" className="px-5 pt-14 pb-28 md:ml-rail md:px-10 md:pt-12 md:pb-12">
        {children}
      </main>
      {bottomNav != null && (
        <div data-slot="app-shell-bottom" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
          {bottomNav}
        </div>
      )}
    </div>
  );
}

export { AppShell };
export type { AppShellProps };
