import { PreferencesSection } from "../components/PreferencesSection";

const noop = () => {};

export default function PreferencesSectionPreview() {
  return (
    <div className="flex flex-col gap-4">
      <PreferencesSection
        theme="system"
        onThemeChange={noop}
        getUpdates
        onGetUpdatesChange={noop}
        colorBlindMode="none"
        onColorBlindModeChange={noop}
      />
      <PreferencesSection
        theme="dark"
        onThemeChange={noop}
        getUpdates={false}
        onGetUpdatesChange={noop}
        colorBlindMode="deuteranopia"
        onColorBlindModeChange={noop}
      />
    </div>
  );
}
