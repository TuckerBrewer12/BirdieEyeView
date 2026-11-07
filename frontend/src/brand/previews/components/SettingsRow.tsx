import { Card, CardHeader, CardTitle } from "@/brand/components/Card";
import { SettingsGroup, SettingsRow } from "@/brand/components/SettingsRow";

const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

const noop = () => {};

/**
 * Compose-style @Preview for SettingsRow: every kind the settings page uses,
 * in a card under its header: a switch on and off, a choice, and a copy row
 * before and after copying and with nothing to copy.
 */
export default function SettingsRowPreview() {
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>App</CardTitle>
      </CardHeader>
      <SettingsGroup>
        <SettingsRow type="switch" label="Email updates" checked onCheckedChange={noop} />
        <SettingsRow type="switch" label="Friend requests" checked={false} onCheckedChange={noop} />
        <SettingsRow type="choose" label="Theme" options={themes} value="system" onValueChange={noop} />
        <SettingsRow type="copy" label="Friend code" value="BIRD-1234" onCopy={noop} />
        <SettingsRow type="copy" label="Copied" value="BIRD-1234" copied onCopy={noop} />
        <SettingsRow type="copy" label="No code yet" value="Unavailable" disabled onCopy={noop} />
      </SettingsGroup>
    </Card>
  );
}
