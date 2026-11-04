import { FlaskConical, Inbox, MapPin, Settings, Trophy, Users } from "lucide-react";
import { MoreMenu } from "@/brand/components/MoreMenu";
import { Sheet, SheetContent } from "@/brand/components/Sheet";

const user = { name: "Test Golfer", initials: "TG", detail: "Handicap 12.4" };

const items = [
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

const everything = [
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/the-lab", label: "The Lab", icon: FlaskConical, active: true },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Compose-style @Preview for MoreMenu, open in the bottom `Sheet` that
 * `BottomNav` raises over the page: first the board's four places, then the
 * app's full list with sign out, on a page behind More.
 */
export default function MoreMenuPreview() {
  return (
    <>
      <div className="relative h-120 overflow-hidden rounded-xl bg-muted">
        <Sheet defaultOpen modal={false}>
          <SheetContent side="bottom" contained showCloseButton={false} initialFocus={false}>
            <MoreMenu items={items} user={user} />
          </SheetContent>
        </Sheet>
      </div>
      <p className="text-label text-muted-foreground">With sign out, on a page behind More</p>
      <div className="relative h-150 overflow-hidden rounded-xl bg-muted">
        <Sheet defaultOpen modal={false}>
          <SheetContent side="bottom" contained showCloseButton={false} initialFocus={false}>
            <MoreMenu items={everything} user={user} onSignOut={() => {}} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
