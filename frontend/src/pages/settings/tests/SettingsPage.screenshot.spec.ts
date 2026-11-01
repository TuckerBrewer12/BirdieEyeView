import { settingsProfile, test } from "./SettingsPage.robot";

test("saved settings, following the device", async ({ settings }) => {
  await settings.open();
  await settings.seesThemePicked("System");
  await settings.seesHomeCourse("Pebble Beach");
  await settings.capture("settings.png");
});

test("saved settings in dark mode", async ({ settings }) => {
  await settings.dark();
  await settings.open();
  await settings.seesThemePicked("Dark");
  await settings.capture("settings-dark.png");
});

test("no home course, searching for one", async ({ settings }) => {
  await settings.open({ profile: settingsProfile({ home_course_id: null, handicap: null }) });
  await settings.searchHomeCourse("Bay");
  await settings.seesCourseResult("Half Moon Bay");
  await settings.capture("settings-home-course-search.png");
});

test("a handicap that will not save", async ({ settings }) => {
  await settings.open();
  await settings.typeHandicap("sixty");
  await settings.seesHandicapError();
  await settings.capture("settings-handicap-error.png");
});

test("leaving with unsaved changes", async ({ settings }) => {
  await settings.open();
  await settings.typeHandicap("6");
  await settings.leaveTo("Rounds");
  await settings.seesLeavePrompt();
  await settings.capture("settings-unsaved-prompt.png");
});

test("settings failed to load", async ({ settings }) => {
  await settings.openFailed();
  await settings.capture("settings-error.png");
});
