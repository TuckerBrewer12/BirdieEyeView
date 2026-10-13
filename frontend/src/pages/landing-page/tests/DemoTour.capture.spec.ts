import { type Page } from "@playwright/test";
import { test, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { sampleGolfer } from "../../../testing/fixtures/sampleGolfer";
import { HANDICAP_TAP, TOUR_LAYOUTS, type TourLayout } from "../components/demoTour";

// A few days after the sample golfer's last round, so "this week" reads true.
const FROZEN_NOW = "2026-06-02T18:00:00.000Z";

/** How far the measured handicap may sit from HANDICAP_TAP before the tap misses it. */
const TAP_TOLERANCE = 0.02;

/** Time for the charts to finish drawing in, which is not something `toHaveScreenshot` waits for. */
const CHARTS_DRAWN_MS = 2500;

async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(CHARTS_DRAWN_MS);
  // Device scale, so the phone captures stay sharp on a phone.
  await expect(page).toHaveScreenshot(name, { scale: "device" });
}

for (const layout of Object.keys(TOUR_LAYOUTS) as TourLayout[]) {
  const { width, height, deviceScaleFactor } = TOUR_LAYOUTS[layout];

  test.describe(`${layout} captures`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor });

    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.clock.setFixedTime(new Date(FROZEN_NOW));
      await FakeSession.install(page, sampleGolfer);
    });

    test("dashboard, and the handicap behind it", async ({ page }) => {
      await page.goto("/");
      const handicap = page.getByRole("button", { name: /Handicap/ }).locator("visible=true").first();
      await expect(handicap).toBeVisible();
      await capture(page, `dashboard-${layout}.png`);

      const box = await handicap.boundingBox();
      expect(box).not.toBeNull();
      const centre = { x: (box!.x + box!.width / 2) / width, y: (box!.y + box!.height / 2) / height };
      expect(Math.abs(centre.x - HANDICAP_TAP[layout].x), "HANDICAP_TAP x").toBeLessThan(TAP_TOLERANCE);
      expect(Math.abs(centre.y - HANDICAP_TAP[layout].y), "HANDICAP_TAP y").toBeLessThan(TAP_TOLERANCE);

      await handicap.click();
      await expect(page.getByRole("heading", { name: "Handicap Index" })).toBeVisible();
      await capture(page, `handicap-${layout}.png`);
    });

    test("analytics", async ({ page }) => {
      await page.goto("/analytics");
      await expect(page.getByText("Analytics", { exact: true }).locator("visible=true").first()).toBeVisible();
      await capture(page, `analytics-${layout}.png`);
    });

    test("the lab", async ({ page }) => {
      await page.goto("/the-lab");
      await expect(page.getByRole("heading", { name: "The Lab" }).locator("visible=true")).toBeVisible();
      await capture(page, `lab-${layout}.png`);
    });
  });
}
