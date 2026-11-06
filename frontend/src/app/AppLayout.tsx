import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppShell, BottomNav, SideNav, type RenderLink } from "@/brand";
import { useAuth } from "@/context/auth";
import { initialsOf, navigationFor } from "./navigation";
import { useSignOut } from "./useSignOut";

const routerLink: RenderLink = (href) => <Link to={href} />;

/** The signed-in frame: hands the route and the golfer to the kit's shell. */
export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const auth = useAuth();
  const signOut = useSignOut(auth);
  const nav = navigationFor(pathname);
  const onSignOut = () => {
    if (!signOut.isPending) signOut.mutate();
  };

  return (
    <AppShell
      sideNav={
        <SideNav
          items={nav.side}
          secondaryItems={nav.sideFooter}
          user={{
            name: auth.name ?? "Golfer",
            initials: initialsOf(auth.name),
            detail: auth.email ?? undefined,
          }}
          onSignOut={onSignOut}
          signingOut={signOut.isPending}
          renderLink={routerLink}
        />
      }
      bottomNav={
        <BottomNav
          tabs={nav.tabs}
          moreItems={nav.more}
          onSignOut={onSignOut}
          signingOut={signOut.isPending}
          renderLink={routerLink}
        />
      }
    >
      {children}
    </AppShell>
  );
}
