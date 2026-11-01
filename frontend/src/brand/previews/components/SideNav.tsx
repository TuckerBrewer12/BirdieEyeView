import { BarChart2, LayoutDashboard, ListOrdered, MapPin, ScanLine, Settings } from "lucide-react";
import { SideNav } from "@/brand/components/SideNav";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Scorecard", icon: ScanLine },
  { href: "/rounds", label: "Rounds", icon: ListOrdered, active: true },
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

/** Compose-style @Preview for SideNav. AppShell sets the rail's size in the app. */
export default function SideNavPreview() {
  return (
    <div className="h-160 w-64">
      <SideNav
        items={items}
        secondaryItems={[{ href: "/settings", label: "Settings", icon: Settings }]}
        user={{ name: "Jordan Castellanos-Whitfield", initials: "JC", detail: "jordan.castellanos-whitfield@example.com" }}
        onSignOut={() => {}}
      />
    </div>
  );
}
