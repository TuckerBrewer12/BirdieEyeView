import { test } from "./SettingsPage.robot";

test("theme control", async ({ settings }) => {
  await settings.open();
  await settings.seesThemeSelected("System");
  await settings.capture("settings-theme.png");
});
