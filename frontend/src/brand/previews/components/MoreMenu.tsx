import { MapPin, Settings, Trophy, Users } from "lucide-react";
import { MoreMenu } from "@/brand/components/MoreMenu";
import { Sheet, SheetContent } from "@/brand/components/Sheet";

const user = { name: "Test Golfer", initials: "TG", detail: "test@example.com" };

const items = [
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/social", label: "Social", icon: Users, badge: 2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * MoreMenu open in the bottom `Sheet` `BottomNav` raises over the page: first the four places with
 * two friend requests waiting at Social, then on a page behind More with none waiting.
 */
export default function MoreMenuPreview() {
  return (
    <>
      <div className="relative h-100 overflow-hidden rounded-xl bg-muted">
        <Sheet defaultOpen modal={false}>
          <SheetContent side="bottom" contained showCloseButton={false} initialFocus={false}>
            <MoreMenu items={items} user={user} />
          </SheetContent>
        </Sheet>
      </div>
      <p className="text-label text-muted-foreground">On a page behind More, nothing waiting</p>
      <div className="relative h-100 overflow-hidden rounded-xl bg-muted">
        <Sheet defaultOpen modal={false}>
          <SheetContent side="bottom" contained showCloseButton={false} initialFocus={false}>
            <MoreMenu
              items={items.map((item) => ({ ...item, badge: 0, active: item.href === "/career" }))}
              user={user}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
