import { test } from "./SettingsPage.robot";

test("theme control, following the device", async ({ settings }) => {
  await settings.open();
  await settings.seesThemePicked("System");
  await settings.capture("settings-theme.png");
});

test("theme control in dark mode", async ({ settings }) => {
  await settings.dark();
  await settings.open();
  await settings.seesThemePicked("Dark");
  await settings.capture("settings-theme-dark.png");
});
