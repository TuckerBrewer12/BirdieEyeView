import { Switch } from "@/brand/components/Switch";

/** Compose-style @Preview for Switch: on and off. */
export default function SwitchPreview() {
  return (
    <div className="flex items-center gap-4">
      <Switch aria-label="On" defaultChecked />
      <Switch aria-label="Off" />
    </div>
  );
}
