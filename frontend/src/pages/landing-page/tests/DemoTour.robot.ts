import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { sampleGolfer } from "../../../testing/fixtures/sampleGolfer";
import { HANDICAP_TAP, TOUR_LAYOUTS, type TourLayout } from "../components/demoTour";

const FROZEN_NOW = "2026-06-02T18:00:00.000Z";

const TAP_TOLERANCE = 0.02;

export class DemoTourRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private handicap(): Locator {
    return this.page.getByRole("button", { name: /Handicap/ }).locator("visible=true").first();
  }

  async prepare(): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await this.page.clock.setFixedTime(new Date(FROZEN_NOW));
    await FakeSession.install(this.page, sampleGolfer);
    return this;
  }

  async openDashboard(): Promise<this> {
    await this.page.goto("/");
    await expect(this.handicap()).toBeVisible();
    return this;
  }

  async seesHandicapTap(layout: TourLayout): Promise<this> {
    const { width, height } = TOUR_LAYOUTS[layout];
    const box = await this.handicap().boundingBox();
    expect(box).not.toBeNull();
    const centre = { x: (box!.x + box!.width / 2) / width, y: (box!.y + box!.height / 2) / height };
    expect(Math.abs(centre.x - HANDICAP_TAP[layout].x), "HANDICAP_TAP x").toBeLessThan(TAP_TOLERANCE);
    expect(Math.abs(centre.y - HANDICAP_TAP[layout].y), "HANDICAP_TAP y").toBeLessThan(TAP_TOLERANCE);
    return this;
  }

  async openHandicap(): Promise<this> {
    await this.handicap().click();
    await expect(this.page.getByRole("heading", { name: "Handicap Index" })).toBeVisible();
    return this;
  }

  async openAnalytics(): Promise<this> {
    await this.page.goto("/analytics");
    await expect(this.page.getByText("Analytics", { exact: true }).locator("visible=true").first()).toBeVisible();
    return this;
  }

  /** The sample golfer's 24 rounds among the headline figures, so the charts have their data. */
  async seesAnalytics(): Promise<this> {
    const rounds = this.page.getByText("Rounds", { exact: true }).locator("xpath=following-sibling::*[1]");
    await expect(rounds.filter({ hasText: /^24$/ }).locator("visible=true").first()).toBeVisible();
    return this;
  }

  async openLab(): Promise<this> {
    await this.page.goto("/the-lab");
    await expect(this.page.getByRole("heading", { name: "The Lab" }).locator("visible=true")).toBeVisible();
    return this;
  }

  /** The par-type card, which both layouts open on, filled in from the golfer's rounds. */
  async seesLab(): Promise<this> {
    await expect(this.page.locator("[data-slot=par-type-card]").locator("visible=true").first()).toBeVisible();
    return this;
  }

  async capture(name: string): Promise<this> {
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page).toHaveScreenshot(name, { scale: "device" });
    return this;
  }
}

export const test = base.extend<{ tour: DemoTourRobot }>({
  tour: async ({ page }, provide) => {
    await provide(new DemoTourRobot(page));
  },
});
