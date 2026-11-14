import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import {
  dashboardGoalReport,
  dashboardUser,
  populatedDashboard,
} from "../../../testing/fixtures/dashboard";
import { storedRounds } from "../../../testing/fixtures/rounds";
import { fontsLoaded } from "../../../testing/fontsLoaded";
import { captureOptions } from "../../../testing/fullPageCapture";

const FROZEN_NOW = "2026-06-15T18:00:00.000Z";

export class DashboardRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await this.page.clock.setFixedTime(new Date(FROZEN_NOW));
    await FakeSession.install(this.page, {
      rounds: storedRounds,
      handicapIndex: 12.4,
      dashboard: populatedDashboard,
      profile: dashboardUser,
      goalReport: dashboardGoalReport,
      ...seed,
    });
    await this.page.goto("/");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await this.seesGreeting();
    await expect(this.page.locator("[data-slot=last-round-card]").locator("visible=true")).toBeVisible();
    return this;
  }

  async seesGreeting(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: /Test$/ }).locator("visible=true")).toBeVisible();
    await expect(this.page.getByText(/^Good evening/).locator("visible=true").first()).toBeVisible();
    return this;
  }

  async seesScoringAverage(label: string): Promise<this> {
    await expect(
      this.page.locator("[data-slot=scoring-average-card]").locator("visible=true").locator("[data-slot=stat-value]"),
    ).toContainText(label);
    return this;
  }

  async seesLastRound(course: string, score: string): Promise<this> {
    const card = this.page.locator("[data-slot=last-round-card]").locator("visible=true");
    await expect(card).toContainText(course);
    await expect(card).toContainText(score);
    await expect(card.getByRole("img", { name: /^Running score to par/ })).toBeVisible();
    return this;
  }

  async openHandicapSheet(): Promise<this> {
    await this.page.getByRole("button", { name: /^Handicap/ }).locator("visible=true").click();
    return this;
  }

  async closeHandicapSheet(): Promise<this> {
    await this.page.getByRole("button", { name: "Close" }).click();
    return this;
  }

  async seesHandicapSheet(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "Handicap index" })).toBeVisible();
    await expect(this.page.getByText("Rounds so far")).toBeVisible();
    await expect(this.page.locator("[data-slot=sheet-overlay]")).toBeVisible();
    return this;
  }

  async doesNotSeeHandicapSheet(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "Handicap index" })).toHaveCount(0);
    return this;
  }

  async openLastRound(): Promise<this> {
    await this.page.locator("[data-slot=last-round-card]").locator("visible=true").click();
    return this;
  }

  async openBestRound(): Promise<this> {
    await this.page.locator("[data-slot=best-round-card]").locator("visible=true").click();
    return this;
  }

  async openRecentRound(course: string): Promise<this> {
    await this.page
      .locator("[data-slot=recent-rounds]")
      .locator("visible=true")
      .locator("[data-slot=round-preview]")
      .filter({ hasText: course })
      .first()
      .click();
    return this;
  }

  async seeAllRounds(): Promise<this> {
    await this.page.getByRole("link", { name: "See all" }).locator("visible=true").click();
    return this;
  }

  async isAtRounds(): Promise<this> {
    await expect(this.page).toHaveURL(/\/rounds$/);
    return this;
  }

  async isAtRound(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${id}$`));
    return this;
  }

  async tapGoal(): Promise<this> {
    await this.page.locator("[data-slot=goal-card]").locator("visible=true").tap();
    return this;
  }

  async isAtLab(): Promise<this> {
    await expect(this.page).toHaveURL(/\/analytics\?tab=profile$/);
    return this;
  }

  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    await fontsLoaded(this.page);
    await expect(this.page).toHaveScreenshot(name, captureOptions(options.fullPage));
    return this;
  }
}

export const test = base.extend<{ dashboard: DashboardRobot }>({
  dashboard: async ({ page }, provide) => {
    await provide(new DashboardRobot(page));
  },
});
