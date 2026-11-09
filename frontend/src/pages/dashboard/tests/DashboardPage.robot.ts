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

const FROZEN_NOW = "2026-06-15T18:00:00.000Z";

/** Screen robot for / — same idea as an Android Espresso robot. */
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
    await expect(this.page.getByText("Blue Rock").locator("visible=true").first()).toBeVisible();
    return this;
  }

  async seesGreeting(): Promise<this> {
    await expect(
      this.page.getByText(/^Hi, Test$/).locator("visible=true"),
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
    await expect(this.page.getByRole("heading", { name: "Handicap index" })).toBeVisible();
    await expect(this.page.getByText("Rounds so far")).toBeVisible();
    await expect(this.page.locator("[data-slot=sheet-overlay]")).toBeVisible();
    return this;
  }

  async doesNotSeeHandicapSheet(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "Handicap index" })).toHaveCount(0);
    return this;
  }

  /** Last 5 / Last 20, above the figures. */
  async showWindow(label: "Last 5" | "Last 20"): Promise<this> {
    await this.page.getByRole("group", { name: "Range" }).locator("visible=true").getByRole("button", { name: label }).click();
    return this;
  }

  async seesWindow(label: "Last 5" | "Last 20"): Promise<this> {
    await expect(
      this.page.getByRole("group", { name: "Range" }).locator("visible=true").getByRole("button", { name: label }),
    ).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  async openRecentRound(course: string): Promise<this> {
    await this.page
      .locator("[data-slot=round-preview][data-variant=compact]")
      .locator("visible=true")
      .filter({ hasText: course })
      .first()
      .click();
    return this;
  }

  async viewAllRounds(): Promise<this> {
    await this.page.getByRole("button", { name: "View all" }).locator("visible=true").click();
    return this;
  }

  async isAtRounds(): Promise<this> {
    await expect(this.page).toHaveURL(/\/rounds$/);
    return this;
  }

  async tapMilestone(title: string): Promise<this> {
    await this.page
      .locator("[data-slot=milestone-feed]")
      .getByRole("button", { name: title })
      .click();
    return this;
  }

  /** A played day on the desktop activity calendar, as "2026-06-15". */
  async tapActivityDay(day: string): Promise<this> {
    await this.page.getByRole("button", { name: `Open round on ${day}` }).locator("visible=true").click();
    return this;
  }

  async isAtRound(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${id}`));
    return this;
  }

  /** The phone's goal card; the desktop grid has its own copy. */
  async tapGoal(): Promise<this> {
    await this.page.locator("[data-slot=goal-card]").locator("visible=true").tap();
    return this;
  }

  async isAtLab(): Promise<this> {
    await expect(this.page).toHaveURL(/\/the-lab$/);
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
