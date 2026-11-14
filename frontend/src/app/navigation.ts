import {
  BarChart2,
  ChartNoAxesColumn,
  House,
  LayoutDashboard,
  List,
  ListOrdered,
  MapPin,
  ScanLine,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import type { NavItem } from "@/brand";

type Destination = Omit<NavItem, "active">;

/** The side rail on wide screens. */
const SIDE: Destination[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Scorecard", icon: ScanLine },
  { href: "/rounds", label: "Rounds", icon: ListOrdered },
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
];

/** Pinned at the foot of the side rail. */
const SIDE_FOOTER: Destination[] = [{ href: "/settings", label: "Settings", icon: Settings }];

/** The phone's tab bar, Scan raised at its middle (with "More" after these four). */
const TABS: Destination[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/rounds", label: "Rounds", icon: List },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
];

/** The rest, behind the tab bar's More sheet. Requests are reached through Social, which counts them. */
const MORE: Destination[] = [
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Whether `href` is the section `pathname` is in. Home only matches itself. */
export function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface AppNavigation {
  side: NavItem[];
  sideFooter: NavItem[];
  tabs: NavItem[];
  more: NavItem[];
}

/** Social also owns its requests (`/inbox`), so it stays marked there. */
function isCurrentSection(pathname: string, href: string): boolean {
  return isCurrent(pathname, href) || (href === "/social" && isCurrent(pathname, "/inbox"));
}

/**
 * Every nav item in the shell, each marked active when it is the section the golfer is in. The More
 * sheet's Social row carries `openRequests`, the friend requests waiting for an answer.
 */
export function navigationFor(pathname: string, openRequests = 0): AppNavigation {
  const mark = (items: Destination[]) =>
    items.map((item) => ({ ...item, active: isCurrentSection(pathname, item.href) }));
  const more = mark(MORE).map((item) => (item.href === "/social" ? { ...item, badge: openRequests } : item));
  return { side: mark(SIDE), sideFooter: mark(SIDE_FOOTER), tabs: mark(TABS), more };
}

/** Avatar letters: the first letter of each of the first two words, or "?" with no name. */
export function initialsOf(name: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}
