import { test } from "./ScanPage.robot";
import { pebbleBeachCourse } from "../../../testing/fixtures/roundDetails";
import { SCANNED_COURSE_NAME } from "../../../testing/fixtures/scan";

test("a picked card is read, then comes back to check", async ({ scan }) => {
  await scan.open({ holdScan: true });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesProcessing();
  await scan.finishScan();
  await scan.seesReview(SCANNED_COURSE_NAME);
});

test("a checked card saves as a round, and opens it", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedRounds(1);
  await scan.tapViewRound();
  await scan.isAtSavedRound();
});

test("a failed scan keeps the photo and says why", async ({ scan }) => {
  await scan.open({ scan: undefined });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesScanFailed();
});

test("a scan still running when the golfer leaves is there when they come back", async ({ scan }) => {
  await scan.open({ holdScan: true });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesProcessing();
  await scan.leaveTo("Rounds");
  await scan.returnToScan();
  await scan.seesProcessing();
  await scan.finishScan();
  await scan.seesReview(SCANNED_COURSE_NAME);
});

test("starting over from the review goes back to an empty upload", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.tapStartOver();
  await scan.seesUpload();
});

test("removing the picked photo goes back to the drop zone", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.removeCard();
  await scan.seesUpload();
});

test("a course can be picked ahead of the scan, and cleared", async ({ scan }) => {
  await scan.open({ fullCourses: [pebbleBeachCourse] });
  await scan.searchCourse("Pebble");
  await scan.pickCourse("Pebble Beach");
  await scan.seesPresetCourse("Pebble Beach");
  await scan.clearPresetCourse();
});

test("entering scores by hand skips the photo and opens a blank card", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.seesSetup();
  await scan.startEntering();
  await scan.seesBlankCard();
});

test("going back to scanning from manual entry brings back the drop zone", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.seesSetup();
  await scan.chooseScanMode();
  await scan.seesUpload();
});

test("a course and a tee can be chosen before entering scores by hand", async ({ scan }) => {
  await scan.open({ fullCourses: [pebbleBeachCourse] });
  await scan.chooseManualEntry();
  await scan.searchSetupCourse("Pebble");
  await scan.pickSetupCourse("Pebble Beach");
  await scan.seesSetupCourse("Pebble Beach");
  await scan.chooseTee("Blue");
  await scan.seesTee("Blue");
});

test("a typed course name is kept when the search finds nothing", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.searchSetupCourse("Muni Nine");
  await scan.keepTypedCourse("Muni Nine");
  await scan.seesSetupCourse("Muni Nine");
});
