import { useState } from "react";
import { Input } from "@/brand/components/Input";
import { SettingsGroup, SettingsRow } from "@/brand/components/SettingsRow";

const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

const noop = () => {};

/** Every kind of row, as the settings page uses them: Golf, App, and Sign out on its own. */
export default function SettingsRowPreview() {
  const [updates, setUpdates] = useState(true);
  const [theme, setTheme] = useState<(typeof themes)[number]["value"]>("system");
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <SettingsGroup title="Golf">
        <SettingsRow
          type="field"
          label="Handicap index"
          controlId="preview-handicap"
          control={<Input id="preview-handicap" size="inline" defaultValue="8.4" className="w-22 text-right" />}
        />
        <SettingsRow type="link" label="Home course" value="Pebble Beach" onClick={noop} />
        <SettingsRow type="copy" label="Friend code" value="BIRD-1234" onCopy={noop} />
        <SettingsRow type="copy" label="Copied" value="BIRD-1234" copied onCopy={noop} />
      </SettingsGroup>
      <SettingsGroup title="App">
        <SettingsRow type="choose" label="Theme" options={themes} value={theme} onValueChange={setTheme} />
        <SettingsRow type="switch" label="Email updates" checked={updates} onCheckedChange={setUpdates} />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow type="action" label="Sign out" tone="danger" onClick={noop} />
      </SettingsGroup>
    </div>
  );
}
