import { test } from "./ScanPage.robot";
import { strokesToPar, toParLabel } from "../../../domain/score";
import { pebbleBeachCourse } from "../../../testing/fixtures/roundDetails";
import { SCANNED_COURSE_NAME, scannedCard, UNSURE_HOLES, unsureCard } from "../../../testing/fixtures/scan";

const CARD_SCORE = scannedCard.round.hole_scores.reduce((total, score) => total + (score.strokes ?? 0), 0);
const CARD_PAR = scannedCard.round.course!.par!;

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

test("after a save, Scan another opens a fresh card", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.tapScanAnother();
  await scan.seesUpload();
  await scan.seesSavedRounds(1);
});

test("a failed save stays on the card and says why", async ({ scan }) => {
  await scan.open({ saveError: "That round could not be saved." });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.tapSave();
  await scan.seesSaveFailed("That round could not be saved.");
  await scan.seesSavedRounds(0);
});

test("a course linked on the review is the one the round is saved against", async ({ scan }) => {
  await scan.open({ fullCourses: [pebbleBeachCourse] });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.searchCourse("Pebble");
  await scan.pickCourse("Pebble Beach");
  await scan.seesLinkedCourse("Pebble Beach");
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedCourse(pebbleBeachCourse.id!);
});

test("a clean scan has nothing to check", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.seesNothingToCheck();
});

test("scores the scan wasn't sure of are ringed until they're typed over, and saved as typed", async ({ scan }) => {
  await scan.open({ scan: unsureCard });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.seesScoresToCheck(UNSURE_HOLES);
  await scan.typeStrokes(4, 6);
  await scan.seesScoresToCheck([11]);
  await scan.typeStrokes(11, 5);
  await scan.seesNothingToCheck();
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedStrokes(4, 6);
  await scan.seesSavedStrokes(11, 5);
});

test("typed strokes and putts change the round being checked, and are what gets saved", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.seesRoundScore(CARD_SCORE);
  await scan.typeStrokes(1, 3);
  await scan.seesRoundScore(CARD_SCORE - 2);
  await scan.typePutts(1, 1);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedStrokes(1, 3);
  await scan.seesSavedPutts(1, 1);
});

test("the card's course name can be kept without linking a course", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.keepCardName(SCANNED_COURSE_NAME);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedCourseName(SCANNED_COURSE_NAME);
});

test("a tee picked from the card's tees is the one saved", async ({ scan }) => {
  const blueTee = { color: "Blue", slope_rating: 128, course_rating: 71.2, hole_yardages: {}, course_handicap: null };
  const teeCard = {
    ...scannedCard,
    round: {
      ...scannedCard.round,
      course: { ...scannedCard.round.course!, tees: [blueTee, { ...blueTee, color: "White", slope_rating: 121 }] },
    },
  };
  await scan.open({ scan: teeCard });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.pickReviewTee("White");
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedTee("White");
});

test("a tee typed in when the card has none is the one saved", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.typeReviewTee("Gold");
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedTee("Gold");
});

test("a failed scan keeps the photo and says why", async ({ scan }) => {
  await scan.open({ scan: undefined });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesScanFailed();
});

test("a failed scan can be reported, and the report says why it failed", async ({ scan }) => {
  await scan.open({ scan: undefined, reportStorage: true });
  await scan.chooseScorecard();
  await scan.seesNoReport();
  await scan.tapExtract();
  await scan.seesScanFailed();
  await scan.tapReportScan();
  await scan.seesReportSent();
});

test("a report that can't be stored says so, and can be sent again", async ({ scan }) => {
  await scan.open({ scan: undefined });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.tapReportScan();
  await scan.seesReportNotSaved("Reporting isn't available yet. Your report wasn't saved.");
});

test("a new photo clears the report with the failed read", async ({ scan }) => {
  await scan.open({ scan: undefined });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesScanFailed();
  await scan.chooseAnotherPhotoFromBanner();
  await scan.seesNoReport();
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

test("a card with putts and shots to green asks for its rows' order", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.markOnCard("Putts");
  await scan.markOnCard("Shots to green");
  await scan.seesRowOrder(["Score", "Putts", "Shots to Green"]);
});

test("the scan is told the golfer's name, the scores to par, and the card's rows in order", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.nameOnCard("Tucker");
  await scan.scoresWrittenToPar();
  await scan.markOnCard("Putts");
  await scan.markOnCard("Shots to green");
  await scan.dragRow("Shots to Green", "Putts");
  await scan.seesRowOrder(["Score", "Shots to Green", "Putts"]);
  await scan.dragNameTo("Putts");
  await scan.seesNameBeside("Putts");
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.seesScanNote(
    "my name is Tucker. scores written to par. name on putts row. row order: score, shots to green, putts",
  );
});

test("Name goes back beside the score when its row comes off the card, as the note says", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.markOnCard("Putts");
  await scan.markOnCard("Shots to green");
  await scan.dragRow("Putts", "Score");
  await scan.dragNameTo("Shots to Green");
  await scan.seesNameBeside("Shots to Green");
  await scan.markOnCard("Shots to green");
  await scan.seesNameBeside("Score");
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.seesScanNote("name on score row. row order: putts, score");
});

test("another photo takes the picked one's place", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.chooseAnotherPhoto();
  await scan.seesChosenCard("another-card.jpg");
});

test("a failed read offers another photo from its banner, which clears it", async ({ scan }) => {
  await scan.open({ scan: undefined });
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesScanFailed();
  await scan.chooseAnotherPhotoFromBanner();
  await scan.seesChosenCard("another-card.jpg");
  await scan.seesNoScanFailure();
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

test("a score typed by hand is the one that gets saved", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.startEntering();
  await scan.seesBlankCard();
  await scan.typeStrokes(1, 5);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedStrokes(1, 5);
});

test("a course and a tee chosen before entering scores by hand are the ones saved", async ({ scan }) => {
  await scan.open({ fullCourses: [pebbleBeachCourse] });
  await scan.chooseManualEntry();
  await scan.searchSetupCourse("Pebble");
  await scan.pickSetupCourse("Pebble Beach");
  await scan.seesSetupCourse("Pebble Beach");
  await scan.chooseTee("Blue");
  await scan.seesTee("Blue");
  await scan.startEntering();
  await scan.seesBlankCard();
  await scan.seesLinkedCourse("Pebble Beach");
  await scan.typeStrokes(1, 4);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedCourse(pebbleBeachCourse.id!);
  await scan.seesSavedTee("Blue");
});

test("a typed course name and tee are kept when the search finds nothing", async ({ scan }) => {
  await scan.open();
  await scan.chooseManualEntry();
  await scan.searchSetupCourse("Muni Nine");
  await scan.keepTypedCourse("Muni Nine");
  await scan.seesSetupCourse("Muni Nine");
  await scan.typeTee("Gold");
  await scan.startEntering();
  await scan.seesBlankCard();
  await scan.typeStrokes(1, 5);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedCourseName("Muni Nine");
  await scan.seesSavedTee("Gold");
});

test("a typed course name can be edited, and a picked course changed", async ({ scan }) => {
  await scan.open({ fullCourses: [pebbleBeachCourse] });
  await scan.chooseManualEntry();
  await scan.searchSetupCourse("Muni Nine");
  await scan.keepTypedCourse("Muni Nine");
  await scan.changeSetupCourse("Link course");
  await scan.seesSetupSearch("Muni Nine");
  await scan.searchSetupCourse("Pebble");
  await scan.pickSetupCourse("Pebble Beach");
  await scan.seesSetupCourse("Pebble Beach");
  await scan.changeSetupCourse("Change course");
  await scan.seesSetupSearch("");
});

test("a saved round shows its score against par, and shares as an image", async ({ scan }) => {
  await scan.open();
  await scan.chooseScorecard();
  await scan.tapExtract();
  await scan.seesReview(SCANNED_COURSE_NAME);
  await scan.tapSave();
  await scan.seesSaved();
  await scan.seesSavedScore(CARD_SCORE, toParLabel(strokesToPar(CARD_SCORE, CARD_PAR))!);
  await scan.tapShare();
  await scan.seesSharedImage("scorecard-half-moon-bay-golf-links.png");
});
