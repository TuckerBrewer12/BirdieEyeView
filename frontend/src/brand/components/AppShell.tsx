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
        <div data-slot="app-shell-side" className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">
          {sideNav}
        </div>
      )}
      <main data-slot="app-shell-main" className="p-4 pt-16 pb-20 md:ml-64 md:p-6 md:pt-16 md:pb-6">
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
