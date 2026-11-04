import { test } from "./ScanPage.robot";
import { pebbleBeachCourse } from "../../../testing/fixtures/roundDetails";
import {
  SCANNED_COURSE_NAME,
  scannedCard,
  scannedTeeCard,
  UNSURE_HOLES,
  unsureCard,
} from "../../../testing/fixtures/scan";

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

test("the phone app's add scorecard sheet", async ({ scan }) => {
  await scan.phoneApp();
  await scan.open();
  await scan.openAddScorecard();
  await scan.seesAddScorecardSheet();
  await scan.capture("scan-add-scorecard.png", { fullPage: false });
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

test("the scanned card under review", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.capture("scan-review.png");
});

test("the scanned card under review in dark mode", async ({ scan }) => {
  await scan.dark();
  await scan.open({ scan: unsureCard });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.seesScoresToCheck(UNSURE_HOLES);
  await scan.capture("scan-review-dark.png");
});

test("a card with scores the scan wasn't sure of", async ({ scan }) => {
  await scan.open({ scan: unsureCard });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.seesScoresToCheck(UNSURE_HOLES);
  await scan.capture("scan-review-to-check.png");
});

test("a card linked to a saved course", async ({ scan }) => {
  await scan.open({ fullCourses: [pebbleBeachCourse] });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.searchCourse("Pebble");
  await scan.pickCourse("Pebble Beach");
  await scan.seesLinkedCourse("Pebble Beach");
  await scan.capture("scan-review-linked.png");
});

test("a card whose tee carries a course handicap", async ({ scan }) => {
  await scan.open({ scan: { ...scannedCard, round: scannedTeeCard } });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview("Torrey Pines");
  await scan.capture("scan-review-rated.png");
});

test("the blank card hand entry opens", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.startEntering();
  await scan.seesBlankCard();
  await scan.capture("scan-review-blank.png");
});

test("a saved round", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.capture("scan-saved.png");
});

test("a saved round in dark mode", async ({ scan }) => {
  await scan.dark();
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.capture("scan-saved-dark.png");
});

test("manual entry setup", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.seesSetup();
  await scan.capture("scan-manual-setup.png");
});

test("manual entry under a typed course name", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.searchSetupCourse("Muni Nine");
  await scan.keepTypedCourse("Muni Nine");
  await scan.seesSetupCourse("Muni Nine");
  await scan.typeTee("Gold");
  await scan.capture("scan-manual-course-named.png");
});

test("manual entry with a course picked", async ({ scan }) => {
  await scan.open({ fullCourses: [pebbleBeachCourse] });
  await scan.chooseManualEntry();
  await scan.searchSetupCourse("Pebble");
  await scan.pickSetupCourse("Pebble Beach");
  await scan.seesSetupCourse("Pebble Beach");
  await scan.chooseTee("Blue");
  await scan.seesTee("Blue");
  await scan.capture("scan-manual-course-picked.png");
});
