import type { ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { isThemePreference, type ThemePreference } from "@/domain/theme";

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

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
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="@container flex flex-col divide-y divide-border">
        <Row labelId="settings-theme-label" label="Theme">
          <ToggleGroup
            aria-labelledby="settings-theme-label"
            size="sm"
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

        <label className="flex items-center justify-between gap-3 py-3 last:pb-0">
          <span className="text-sm text-card-foreground">Get updates</span>
          <Checkbox
            checked={getUpdates}
            onChange={(event) => onGetUpdatesChange(event.target.checked)}
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
