import { Switch } from "@/brand/components/Switch";

/** Compose-style @Preview for Switch. */
export default function SwitchPreview() {
  return (
    <div className="flex items-center gap-4">
      <Switch aria-label="On" defaultChecked />
      <Switch aria-label="Off" />
      <Switch aria-label="On, disabled" defaultChecked disabled />
      <Switch aria-label="Off, disabled" disabled />
    </div>
  );
}
