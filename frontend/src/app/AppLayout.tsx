import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppShell, BottomNav, SideNav, type RenderLink } from "@/brand";
import { useAuth } from "@/context/auth";
import { awaitsAnswer } from "@/data/friendsModel";
import { useFriendships } from "@/data/useFriendships";
import { initialsOf, navigationFor } from "./navigation";
import { useSignOut } from "./useSignOut";

const routerLink: RenderLink = (href) => <Link to={href} />;

/** The signed-in frame: hands the route and the golfer to the kit's shell. */
export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const auth = useAuth();
  const signOut = useSignOut(auth);
  // Shared with Social's own read of the list, so the More sheet's count and the page's agree.
  const { data: friendships = [] } = useFriendships(auth.userId ?? "");
  const nav = navigationFor(pathname, friendships.filter(awaitsAnswer).length);
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
