import { FlaskConical, Inbox, MapPin, Settings, Trophy, Users } from "lucide-react";
import { MoreMenu } from "@/brand/components/MoreMenu";

const user = { name: "Test Golfer", initials: "TG", detail: "Handicap 12.4" };

const items = [
  { href: "/courses", label: "Courses", icon: MapPin },
  { href: "/career", label: "Career", icon: Trophy },
  { href: "/friends", label: "Friends", icon: Users, badge: 2 },
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

/** The dimmed page `BottomNav` puts behind the sheet. */
const dim =
  "flex min-h-preview flex-col justify-end overflow-hidden rounded-xl bg-foreground/45 dark:bg-background/60";

/**
 * Compose-style @Preview for MoreMenu. In the app `BottomNav` raises the sheet
 * from the screen's foot over a dimmed page; here each sits at the foot of a
 * dimmed stage.
 */
export default function MoreMenuPreview() {
  return (
    <>
      <div className={dim}>
        <MoreMenu items={items} user={user} />
      </div>
      <p className="text-label text-muted-foreground">With sign out, on a page behind More</p>
      <div className={dim}>
        <MoreMenu items={everything} user={user} onSignOut={() => {}} />
      </div>
    </>
  );
}
