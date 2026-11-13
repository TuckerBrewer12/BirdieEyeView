import {
  ChartNoAxesColumn,
  House,
  Inbox,
  List,
  MapPin,
  ScanLine,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { BottomNav } from "@/brand/components/BottomNav";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/rounds", label: "Rounds", icon: List },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
];

const more = [
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

const at = (items: typeof tabs, href: string) =>
  items.map((item) => ({ ...item, active: item.href === href }));

/**
 * Compose-style @Preview for BottomNav. AppShell pins the bar to the screen's
 * foot in the app; here each sits in the stage, the first with room above it
 * for the More sheet.
 */
export default function BottomNavPreview() {
  return (
    <>
      <div className="flex h-preview flex-col justify-end">
        <BottomNav tabs={at(tabs, "/rounds")} featuredHref="/scan" moreItems={more} />
      </div>
      {/* On a page behind More, the More tab is the lit one. */}
      <BottomNav tabs={tabs} featuredHref="/scan" moreItems={at(more, "/courses")} />
    </>
  );
}
