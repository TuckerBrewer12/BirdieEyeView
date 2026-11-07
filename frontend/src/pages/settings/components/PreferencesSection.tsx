import { Monitor, Moon, Sun } from "lucide-react";
import { Card, CardHeader, CardTitle, SettingsGroup, SettingsRow } from "@/brand";
import type { ThemePreference } from "@/domain/theme";

const THEME_OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const satisfies ReadonlyArray<{ value: ThemePreference; label: string; Icon: typeof Sun }>;

const themeOptions = THEME_OPTIONS.map(({ value, label, Icon }) => ({
  value,
  label: (
    <>
      <Icon data-icon="inline-start" />
      {label}
    </>
  ),
}));

interface PreferencesSectionProps {
  /** Applies and is kept the moment it is picked, like the device's own setting. */
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  getUpdates: boolean;
  onGetUpdatesChange: (on: boolean) => void;
}

/** Theme and updates. Updates is kept with Save. */
export function PreferencesSection({
  theme,
  onThemeChange,
  getUpdates,
  onGetUpdatesChange,
}: PreferencesSectionProps) {
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <SettingsGroup>
        <SettingsRow
          type="choose"
          label="Theme"
          options={themeOptions}
          value={theme}
          onValueChange={onThemeChange}
        />
        <SettingsRow
          type="switch"
          label="Get updates"
          checked={getUpdates}
          onCheckedChange={onGetUpdatesChange}
        />
      </SettingsGroup>
    </Card>
  );
}
