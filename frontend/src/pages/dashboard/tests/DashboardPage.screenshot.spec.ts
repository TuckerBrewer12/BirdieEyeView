import { test } from "./DashboardPage.robot";
import { populatedDashboard } from "../../../testing/fixtures/dashboard";

test("populated dashboard", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.seesScoringAverage("76.8");
  await dashboard.capture("dashboard-populated.png");
});

test("populated dashboard in dark mode", async ({ dashboard }) => {
  await dashboard.dark();
  await dashboard.open();
  await dashboard.seesScoringAverage("76.8");
  await dashboard.capture("dashboard-populated-dark.png");
});

test("worded milestone feed", async ({ dashboard }) => {
  await dashboard.open({
    dashboard: {
      ...populatedDashboard,
      milestones: [
        {
          kind: "score_break",
          value: 69,
          date: "2026-04-18",
          course: "Blue Rock",
          round_id: "round-3",
        },
      ],
    },
  });
  await dashboard.capture("dashboard-milestone-feed.png");
});

test("handicap sheet open", async ({ dashboard }) => {
  await dashboard.open();
  await dashboard.openHandicapSheet();
  await dashboard.seesHandicapSheet();
  await dashboard.capture("dashboard-handicap-sheet.png", { fullPage: false });
});
