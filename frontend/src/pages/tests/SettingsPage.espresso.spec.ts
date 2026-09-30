import { test } from "./SettingsPage.robot";

test("a theme pick sticks without save and without the unsaved-changes guard", async ({
  settings,
}) => {
  await settings.open();
  await settings.pickTheme("Dark");
  await settings.seesThemeSelected("Dark");
  await settings.seesStoredTheme("dark");
  await settings.doesNotSeeSaved();
  await settings.leaveTo("Dashboard");
  await settings.isAt("/");
  await settings.doesNotSeeUnsavedChanges();
  await settings.returnToSettings();
  await settings.seesThemeSelected("Dark");
  await settings.seesStoredTheme("dark");
});
