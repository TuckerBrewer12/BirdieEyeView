import { settingsProfile, test } from "./SettingsPage.robot";

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

test("a new handicap is saved and kept", async ({ settings }) => {
  await settings.open();
  await settings.seesHandicap("8.4");

  await settings.typeHandicap("+1.5");
  await settings.save();
  await settings.seesSaved();

  await settings.reload();
  await settings.seesHandicap("+1.5");
});

test("a handicap out of range cannot be saved", async ({ settings }) => {
  await settings.open();
  await settings.typeHandicap("60");
  await settings.seesHandicapError();
  await settings.cannotSave();
});

test("a home course is picked from a search and kept", async ({ settings }) => {
  await settings.open({ profile: settingsProfile({ home_course_id: null }) });
  await settings.seesNoHomeCourse();

  await settings.searchHomeCourse("Blue");
  await settings.pickHomeCourse("Blue Rock");
  await settings.seesHomeCourse("Blue Rock");
  await settings.save();
  await settings.seesSaved();

  await settings.reload();
  await settings.seesHomeCourse("Blue Rock");
});

test("removing the home course is saved", async ({ settings }) => {
  await settings.open();
  await settings.seesHomeCourse("Pebble Beach");

  await settings.removeHomeCourse();
  await settings.seesNoHomeCourse();
  await settings.save();
  await settings.seesSaved();

  await settings.reload();
  await settings.seesNoHomeCourse();
});

test("Get updates is kept with Save", async ({ settings }) => {
  await settings.open();
  await settings.turnOffUpdates();
  await settings.save();
  await settings.seesSaved();

  await settings.reload();
  await settings.seesUpdatesOff();
});

test("Copy puts the friend code on the clipboard", async ({ settings }) => {
  await settings.allowClipboard();
  await settings.open();
  await settings.copyFriendCode();
  await settings.seesCopied("BIRD-1234");
});

test("a copy the browser refuses says so", async ({ settings }) => {
  await settings.blockClipboard();
  await settings.open();
  await settings.copyFriendCode();
  await settings.seesCopyFailed();
});

test("trying again replaces a failed load with the settings form", async ({ settings }) => {
  await settings.openFailed();
  settings.nextLoadSucceeds();
  await settings.tryAgain();
  await settings.seesForm();
  await settings.seesHandicap("8.4");
  await settings.seesHomeCourse("Pebble Beach");
});

test("a failed save says why and keeps the edit", async ({ settings }) => {
  await settings.open();
  settings.failSavesWith("Selected home course was not found");
  await settings.typeHandicap("3");
  await settings.save();
  await settings.seesSaveError("Selected home course was not found");
  await settings.seesHandicap("3");
});

test("leaving with unsaved changes asks first, and discarding leaves", async ({ settings }) => {
  await settings.open();
  await settings.typeHandicap("6");
  await settings.leaveTo("Dashboard");
  await settings.seesLeavePrompt();

  await settings.discardAndLeave();
  await settings.isAt("/");

  await settings.returnToSettings();
  await settings.seesHandicap("8.4");
});

test("saving from the prompt keeps the change and leaves", async ({ settings }) => {
  await settings.open();
  await settings.typeHandicap("6");
  await settings.leaveTo("Dashboard");
  await settings.saveAndLeave();
  await settings.isAt("/");

  await settings.returnToSettings();
  await settings.seesHandicap("6");
});

test("a failed save from the prompt shows the reason and stays", async ({ settings }) => {
  await settings.open();
  settings.failSavesWith("Selected home course was not found");
  await settings.typeHandicap("6");
  await settings.leaveTo("Dashboard");
  await settings.saveAndLeave();
  await settings.seesLeavePromptError("Selected home course was not found");
  await settings.staysAt("/settings");
});

test("closing the prompt stays on the page with the edit", async ({ settings }) => {
  await settings.open();
  await settings.typeHandicap("6");
  await settings.leaveTo("Dashboard");
  await settings.stay();
  await settings.isAt("/settings");
  await settings.seesHandicap("6");
});
