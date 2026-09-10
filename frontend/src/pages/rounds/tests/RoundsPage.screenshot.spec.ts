import { test } from "./RoundsPage.robot";
import { populatedRounds } from "../../../testing/fixtures/rounds";

test("populated list", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.seesCourse("Half Moon Bay");
  await rounds.capture("rounds-populated.png");
});

test("populated list in dark mode", async ({ rounds }) => {
  await rounds.dark();
  await rounds.open(populatedRounds);
  await rounds.seesCourse("Half Moon Bay");
  await rounds.capture("rounds-populated-dark.png");
});

test("empty list", async ({ rounds }) => {
  await rounds.open([]);
  await rounds.seesEmptyState();
  await rounds.capture("rounds-empty.png");
});

test("course link panel open", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.openLinkFor("Scanned Scorecard");
  await rounds.seesLinkPanel("Scanned Scorecard");
  await rounds.capture("rounds-link-open.png");
});

test("sort menu open", async ({ rounds }) => {
  await rounds.open(populatedRounds);
  await rounds.openSortMenu();
  await rounds.capture("rounds-sort-open.png");
});
