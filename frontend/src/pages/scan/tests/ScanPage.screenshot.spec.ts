import { test } from "./ScanPage.robot";
import { pebbleBeachCourse } from "../../../testing/fixtures/roundDetails";

test("upload, nothing picked", async ({ scan }) => {
  await scan.open();
  await scan.seesUpload();
  await scan.capture("scan-upload.png");
});

test("upload in dark mode", async ({ scan }) => {
  await scan.dark();
  await scan.open();
  await scan.seesUpload();
  await scan.capture("scan-upload-dark.png");
});

test("a chosen card, ready to scan", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.seesChosenCard();
  await scan.capture("scan-card-chosen.png");
});

test("a course picked ahead of the scan", async ({ scan }) => {
  await scan.open({ fullCourses: [pebbleBeachCourse] });
  await scan.searchCourse("Pebble");
  await scan.pickCourse("Pebble Beach");
  await scan.seesPresetCourse("Pebble Beach");
  await scan.capture("scan-course-picked.png");
});

test("the card being read", async ({ scan }) => {
  await scan.open({ holdScan: true });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesProcessing();
  await scan.capture("scan-processing.png", { maskScanAnimation: true });
});

test("the card being read in dark mode", async ({ scan }) => {
  await scan.dark();
  await scan.open({ holdScan: true });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesProcessing();
  await scan.capture("scan-processing-dark.png", { maskScanAnimation: true });
});

test("a failed scan", async ({ scan }) => {
  await scan.open({ scan: undefined });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesScanFailed();
  await scan.capture("scan-failed.png");
});

test("manual entry setup", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.seesSetup();
  await scan.capture("scan-manual-setup.png");
});
