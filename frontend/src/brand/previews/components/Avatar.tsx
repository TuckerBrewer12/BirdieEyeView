import { Avatar } from "@/brand/components/Avatar";

export default function AvatarPreview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl bg-card p-4">
        <Avatar initials="AL" />
        <Avatar initials="JC" size="sm" />
        <Avatar initials="?" />
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-sidebar p-4 text-sidebar-foreground">
        <Avatar initials="TG" size="sm" tone="rail" />
        <Avatar initials="TG" tone="rail" />
      </div>
    </div>
  );
}
