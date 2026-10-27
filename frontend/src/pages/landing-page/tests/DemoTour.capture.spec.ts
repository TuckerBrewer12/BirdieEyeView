import { test } from "./DemoTour.robot";
import { TOUR_LAYOUTS, type TourLayout } from "../components/demoTour";

for (const layout of Object.keys(TOUR_LAYOUTS) as TourLayout[]) {
  const { width, height, deviceScaleFactor } = TOUR_LAYOUTS[layout];

  test.describe(`${layout} captures`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor });

    test.beforeEach(async ({ tour }) => {
      await tour.prepare();
    });

    test("dashboard, and the handicap behind it", async ({ tour }) => {
      await tour.openDashboard();
      await tour.capture(`dashboard-${layout}.png`);
      await tour.seesHandicapTap(layout);
      await tour.openHandicap();
      await tour.capture(`handicap-${layout}.png`);
    });

    test("analytics", async ({ tour }) => {
      await tour.openAnalytics();
      await tour.capture(`analytics-${layout}.png`);
    });

    test("the lab", async ({ tour }) => {
      await tour.openLab();
      await tour.capture(`lab-${layout}.png`);
    });
  });
}
