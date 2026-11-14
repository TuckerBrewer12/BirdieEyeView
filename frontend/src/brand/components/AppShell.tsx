import type * as React from "react";
import { cn } from "@/brand/cn";

interface AppShellProps extends React.ComponentProps<"div"> {
  sideNav?: React.ReactNode;
  bottomNav?: React.ReactNode;
}

function AppShell({ sideNav, bottomNav, className, children, ...props }: AppShellProps) {
  return (
    <div data-slot="app-shell" className={cn("min-h-screen", className)} {...props}>
      {sideNav != null && (
        <div data-slot="app-shell-side" className="fixed inset-y-0 left-0 z-30 hidden w-rail md:block">
          {sideNav}
        </div>
      )}
      <main
        data-slot="app-shell-main"
        className="px-page-phone pt-15 pb-page-end-phone has-data-[slot=action-bar]:pb-page-end-action-bar md:ml-rail md:px-page md:pt-11 md:pb-12 md:has-data-[slot=action-bar]:pb-12 md:has-data-[pinned=always]:pb-page-end-pinned"
      >
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
