import { SettingsGroup, SettingsRow } from "@/brand";
import type { ThemePreference } from "@/domain/theme";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

interface PreferencesSectionProps {
  /** Applies and is kept the moment it is picked, like the device's own setting. */
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  getUpdates: boolean;
  onGetUpdatesChange: (on: boolean) => void;
}

/** The app's own settings: theme, and email updates (kept with Save). */
export function PreferencesSection({ theme, onThemeChange, getUpdates, onGetUpdatesChange }: PreferencesSectionProps) {
  return (
    <SettingsGroup title="App">
      <SettingsRow type="choose" label="Theme" options={THEME_OPTIONS} value={theme} onValueChange={onThemeChange} />
      <SettingsRow type="switch" label="Email updates" checked={getUpdates} onCheckedChange={onGetUpdatesChange} />
    </SettingsGroup>
  );
}
