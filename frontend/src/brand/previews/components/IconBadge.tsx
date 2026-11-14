import { Bird, Flag, Flame, Medal, Target, Trophy } from "lucide-react";
import { IconBadge } from "@/brand/components/IconBadge";

export default function IconBadgePreview() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <IconBadge icon={Trophy} tone="eagle" />
      <IconBadge icon={Bird} tone="birdie" />
      <IconBadge icon={Medal} tone="par" />
      <IconBadge icon={Flame} tone="bogey" />
      <IconBadge icon={Target} tone="primary" />
      <IconBadge icon={Flag} tone="info" />
    </div>
  );
}
