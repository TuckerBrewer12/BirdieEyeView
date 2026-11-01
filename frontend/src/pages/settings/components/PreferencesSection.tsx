import type { ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { isThemePreference, type ThemePreference } from "@/domain/theme";
import type { ColorBlindMode } from "../model";

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

const COLOR_BLIND_OPTIONS: { value: ColorBlindMode; label: string }[] = [
  { value: "none", label: "No filter" },
  { value: "protanopia", label: "Protanopia" },
  { value: "deuteranopia", label: "Deuteranopia" },
  { value: "tritanopia", label: "Tritanopia" },
];

interface PreferencesSectionProps {
  /** Applies and is kept the moment it is picked, like the device's own setting. */
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  getUpdates: boolean;
  onGetUpdatesChange: (on: boolean) => void;
  colorBlindMode: ColorBlindMode;
  onColorBlindModeChange: (mode: ColorBlindMode) => void;
}

/** Theme, updates and colour-blind mode. The last two are kept with Save. */
export function PreferencesSection({
  theme,
  onThemeChange,
  getUpdates,
  onGetUpdatesChange,
  colorBlindMode,
  onColorBlindModeChange,
}: PreferencesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="@container flex flex-col divide-y divide-border">
        <Row labelId="settings-theme-label" label="Theme">
          <ToggleGroup
            aria-labelledby="settings-theme-label"
            variant="outline"
            size="sm"
            spacing={0}
            value={[theme]}
            onValueChange={(values) => {
              // Pressing the chosen option again would clear it; a theme is always chosen.
              const next = values[0];
              if (isThemePreference(next)) onThemeChange(next);
            }}
          >
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <ToggleGroupItem key={value} value={value}>
                <Icon data-icon="inline-start" />
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>

        <Row labelId="settings-color-blind-label" label="Color blind mode">
          <ToggleGroup
            aria-labelledby="settings-color-blind-label"
            variant="outline"
            size="sm"
            spacing={0}
            value={[colorBlindMode]}
            onValueChange={(values) => {
              const next = COLOR_BLIND_OPTIONS.find((option) => option.value === values[0]);
              if (next) onColorBlindModeChange(next.value);
            }}
          >
            {COLOR_BLIND_OPTIONS.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value}>
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>

        <label className="flex items-center justify-between gap-3 py-3 last:pb-0">
          <span className="text-sm text-card-foreground">Get updates</span>
          <input
            type="checkbox"
            checked={getUpdates}
            onChange={(event) => onGetUpdatesChange(event.target.checked)}
            className="size-4 accent-primary"
          />
        </label>
      </CardContent>
    </Card>
  );
}

function Row({ labelId, label, children }: { labelId: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 @lg:flex-row @lg:items-center @lg:justify-between">
      <span id={labelId} className="text-sm text-card-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
