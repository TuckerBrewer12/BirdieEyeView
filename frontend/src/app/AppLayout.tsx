import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppShell, BottomNav, SideNav, type RenderLink } from "@/brand";
import { useAuth } from "@/context/auth";
import { useOpenRequestCount } from "@/data/useOpenRequestCount";
import { initialsOf, navigationFor } from "./navigation";
import { useSignOut } from "./useSignOut";

const routerLink: RenderLink = (href) => <Link to={href} />;

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const auth = useAuth();
  const signOut = useSignOut(auth);
  const { data: openRequests = 0 } = useOpenRequestCount(auth.userId ?? "");
  const nav = navigationFor(pathname, openRequests);
  const user = {
    name: auth.name ?? "Golfer",
    initials: initialsOf(auth.name),
    detail: auth.email ?? undefined,
  };
  const onSignOut = () => {
    if (!signOut.isPending) signOut.mutate();
  };

  return (
    <AppShell
      sideNav={
        <SideNav
          items={nav.side}
          secondaryItems={nav.sideFooter}
          user={user}
          onSignOut={onSignOut}
          signingOut={signOut.isPending}
          renderLink={routerLink}
        />
      }
      bottomNav={
        <BottomNav
          tabs={nav.tabs}
          featuredHref="/scan"
          moreItems={nav.more}
          user={user}
          renderLink={routerLink}
        />
      }
    >
      {children}
    </AppShell>
  );
}
