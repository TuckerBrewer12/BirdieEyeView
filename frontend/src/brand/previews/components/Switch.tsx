import { Switch } from "@/brand/components/Switch";

export default function SwitchPreview() {
  return (
    <div className="flex items-center gap-4">
      <Switch aria-label="On" defaultChecked />
      <Switch aria-label="Off" />
      <Switch aria-label="Disabled" disabled />
    </div>
  );
}
