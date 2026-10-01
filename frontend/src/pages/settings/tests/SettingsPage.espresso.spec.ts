import { test } from "./SettingsPage.robot";

test("a theme pick applies at once, needs no Save, and is kept", async ({ settings }) => {
  await settings.open();
  await settings.seesThemePicked("System");
  await settings.seesTheme("light");

  await settings.pickTheme("Dark");
  await settings.seesThemePicked("Dark");
  await settings.seesTheme("dark");

  await settings.leaveTo("Dashboard");
  await settings.isAt("/");

  await settings.open();
  await settings.seesThemePicked("Dark");
  await settings.seesTheme("dark");
});

test("System hands the theme back to the device", async ({ settings }) => {
  await settings.dark();
  await settings.open();
  await settings.pickTheme("System");
  await settings.seesThemePicked("System");
  await settings.seesTheme("light");
  await settings.reload();
  await settings.seesThemePicked("System");
});
