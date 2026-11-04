import {
  BarChart2,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  MapPin,
  ScanLine,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { BottomNav } from "@/brand/components/BottomNav";

const tabs = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/rounds", label: "Rounds", icon: ListOrdered },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

const more = [
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/the-lab", label: "The Lab", icon: FlaskConical },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

const at = (items: typeof tabs, href: string) =>
  items.map((item) => ({ ...item, active: item.href === href }));

/**
 * Compose-style @Preview for BottomNav. AppShell pins the bar to the screen's
 * foot in the app; here each sits in the stage. More opens `MoreMenu` in a
 * bottom sheet over the page (see its preview).
 */
export default function BottomNavPreview() {
  return (
    <>
      <BottomNav tabs={at(tabs, "/")} moreItems={more} onSignOut={() => {}} />
      {/* On a page behind More, the More tab is the lit one. */}
      <BottomNav tabs={tabs} moreItems={at(more, "/courses")} onSignOut={() => {}} />
    </>
  );
}
