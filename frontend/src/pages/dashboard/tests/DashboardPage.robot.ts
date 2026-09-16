import { test as base, expect, type Page } from "@playwright/test";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import {
  dashboardDetailRounds,
  dashboardGoalReport,
  dashboardUser,
  populatedAnalytics,
  populatedDashboard,
} from "../../../testing/fixtures/dashboard";
import { populatedRounds } from "../../../testing/fixtures/rounds";

const FROZEN_NOW = "2026-06-15T18:00:00.000Z";

/** Screen robot for / — same idea as an Android Espresso robot. */
export class DashboardRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("settings_theme", "dark");
      localStorage.setItem("public_theme", "dark");
    });
    return this;
  }

  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await this.page.clock.setFixedTime(new Date(FROZEN_NOW));
    await FakeSession.install(this.page, {
      rounds: populatedRounds,
      detailRounds: dashboardDetailRounds,
      handicapIndex: 12.4,
      dashboard: populatedDashboard,
      analytics: populatedAnalytics,
      profile: dashboardUser,
      goalReport: dashboardGoalReport,
      ...seed,
    });
    await this.page.goto("/");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await this.seesGreeting();
    await expect(this.page.getByText("Blue Rock").locator("visible=true").first()).toBeVisible();
    return this;
  }

  async seesGreeting(): Promise<this> {
    await expect(
      this.page.getByText(/^(Hi Test|Hello, Test)$/).locator("visible=true"),
    ).toBeVisible();
    return this;
  }

  async seesScoringAverage(label: string): Promise<this> {
    await expect(this.page.getByText(label, { exact: true }).locator("visible=true").first()).toBeVisible();
    return this;
  }

  async openHandicapSheet(): Promise<this> {
    await this.page.getByRole("button", { name: /Handicap/ }).click();
    return this;
  }

  async closeHandicapSheet(): Promise<this> {
    await this.page.getByRole("button", { name: "Close" }).click();
    return this;
  }

  async seesHandicapSheet(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "Handicap Index" })).toBeVisible();
    await expect(this.page.getByText("WHS Formula")).toBeVisible();
    await expect(this.page.locator("[data-slot=sheet-overlay]")).toBeVisible();
    return this;
  }

  async doesNotSeeHandicapSheet(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "Handicap Index" })).toHaveCount(0);
    return this;
  }

  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: options.fullPage ?? true });
    return this;
  }
}

export const test = base.extend<{ dashboard: DashboardRobot }>({
  dashboard: async ({ page }, provide) => {
    await provide(new DashboardRobot(page));
  },
});
