import { BarChart2, LayoutDashboard, ListOrdered, MapPin, ScanLine, Settings } from "lucide-react";
import { AppShell } from "@/brand/components/AppShell";
import { BottomNav } from "@/brand/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand/components/Card";
import { PageTitle } from "@/brand/components/PageTitle";
import { SideNav } from "@/brand/components/SideNav";

const side = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Scorecard", icon: ScanLine },
  { href: "/rounds", label: "Rounds", icon: ListOrdered, active: true },
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

const tabs = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/rounds", label: "Rounds", icon: ListOrdered, active: true },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

const more = [
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShellPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 overflow-auto bg-background">
      <AppShell
        sideNav={
          <SideNav
            items={side}
            secondaryItems={[{ href: "/settings", label: "Settings", icon: Settings }]}
            user={{ name: "Avery Lin", initials: "AL", detail: "avery@example.com" }}
            onSignOut={() => {}}
          />
        }
        bottomNav={<BottomNav tabs={tabs} moreItems={more} onSignOut={() => {}} />}
      >
        <div className="flex flex-col gap-4">
          <PageTitle>Rounds</PageTitle>
          {["Pebble Beach Golf Links", "Half Moon Bay", "Torrey Pines South"].map((name) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardDescription>The page sits between the navs.</CardDescription>
              </CardHeader>
              <CardContent>Par 72</CardContent>
            </Card>
          ))}
        </div>
      </AppShell>
    </div>
  );
}
