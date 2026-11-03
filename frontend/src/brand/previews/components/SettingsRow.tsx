import { SettingsGroup, SettingsRow } from "@/brand/components/SettingsRow";

const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

/**
 * Compose-style @Preview for SettingsRow: one group of every kind, then a
 * sign-out group. Shown in the window frame, as wide as the board.
 */
export default function SettingsRowPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 overflow-auto bg-background p-6">
      <div className="flex w-108 flex-col gap-4">
        <SettingsGroup title="App">
          <SettingsRow type="navigate" label="Home course" value="Pebble Beach" href="#" />
          <SettingsRow
            type="switch"
            label="Email updates"
            description="New features, once a month"
            defaultChecked
          />
          <SettingsRow type="switch" label="Friend requests" />
          <SettingsRow type="choose" label="Theme" options={themes} defaultValue="system" />
          <SettingsRow type="copy" label="Friend code" value="BIRD-1234" actionLabel="Copy friend code" />
        </SettingsGroup>
        <SettingsGroup>
          <SettingsRow type="destructive" label="Sign out" />
        </SettingsGroup>
      </div>
    </div>
  );
}
