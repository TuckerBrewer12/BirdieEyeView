import { ChartNoAxesColumn, LayoutDashboard, List, MapPin, ScanLine, Settings, Trophy, Users } from "lucide-react";
import { SideNav } from "@/brand/components/SideNav";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan", icon: ScanLine, active: true },
  { href: "/rounds", label: "Rounds", icon: List },
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
];

/** Compose-style @Preview for SideNav. AppShell sets the rail's size in the app. */
export default function SideNavPreview() {
  return (
    <div className="h-180 w-60">
      <SideNav
        items={items}
        secondaryItems={[{ href: "/settings", label: "Settings", icon: Settings }]}
        user={{ name: "Test Golfer", initials: "TG" }}
      />
    </div>
  );
}
