import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { populatedFriendships } from "../../../testing/fixtures/friendships";
import { labAnalyticsByGolfer, labGoalReport, labUser } from "../../../testing/fixtures/lab";

/** Screen robot for /the-lab — same idea as an Android Espresso robot. */
export class TheLabRobot {
  private readonly page: Page;
  private backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  /** A golfer out to break 90, with two friends; seed fields replace the defaults. */
  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    this.backend = await FakeSession.install(this.page, {
      profile: labUser,
      goalReport: labGoalReport,
      labAnalytics: labAnalyticsByGolfer,
      friends: { friendships: populatedFriendships },
      ...seed,
    });
    await this.page.goto("/the-lab");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    return this;
  }

  async openWithoutGoal(): Promise<this> {
    return this.open({ profile: { ...labUser, scoring_goal: null } });
  }

  /** Opens with the golfer's analytics failing to load. */
  async openFailing(): Promise<this> {
    return this.open({ labAnalytics: {}, analytics: null });
  }

  /** The server comes back: the golfer's analytics load from here on. */
  async analyticsRecover(): Promise<this> {
    if (this.backend) this.backend.labAnalytics = labAnalyticsByGolfer;
    return this;
  }

  async seesLab(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "The Lab" }).locator("visible=true").first()).toBeVisible();
    return this;
  }

  async seesLoadError(message: string): Promise<this> {
    await expect(this.page.getByText(message)).toBeVisible();
    return this;
  }

  async retry(): Promise<this> {
    await this.page.getByRole("button", { name: "Retry" }).click();
    return this;
  }

  private goalPicker() {
    return this.page.locator("[data-slot=goal-picker]");
  }

  async pickGoal(label: string): Promise<this> {
    await this.goalPicker().getByRole("button", { name: label, exact: true }).click();
    return this;
  }

  async seesGoalPicked(label: string): Promise<this> {
    await expect(this.goalPicker().getByRole("button", { name: label, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    return this;
  }

  /** The goal standing card leads with the goal: "Break 85". */
  async seesGoalStanding(label: string): Promise<this> {
    await expect(this.page.locator("[data-slot=goal-standing]").getByText(label, { exact: true })).toBeVisible();
    return this;
  }

  async savedGoal(target: number): Promise<this> {
    await expect.poll(() => this.backend?.profile?.scoring_goal).toBe(target);
    return this;
  }

  /** The next save fails with this message, as the API would answer. */
  failSavesWith(detail: string): this {
    if (this.backend) this.backend.updateUserError = detail;
    return this;
  }

  async seesGoalSaveError(message: string): Promise<this> {
    await expect(this.page.getByRole("alert").filter({ hasText: message })).toBeVisible();
    return this;
  }

  async seesSaver(headline: string): Promise<this> {
    await expect(this.page.locator("[data-slot=saver-card]").getByText(headline)).toBeVisible();
    return this;
  }

  private shapeCard() {
    return this.page.locator("[data-slot=performance-shape]");
  }

  async compareWith(label: string): Promise<this> {
    await this.shapeCard()
      .locator("[data-slot=comparison-picker]")
      .getByRole("button", { name: label, exact: true })
      .click();
    return this;
  }

  async pickFriend(name: string): Promise<this> {
    await this.shapeCard()
      .locator("[data-slot=friend-picker]")
      .getByRole("button", { name, exact: true })
      .click();
    return this;
  }

  async showShape(label: "Your Average" | "Peak Game"): Promise<this> {
    await this.shapeCard().getByRole("button", { name: label, exact: true }).click();
    return this;
  }

  async seesShapeHeading(heading: string | RegExp): Promise<this> {
    await expect(this.shapeCard().getByText(heading).first()).toBeVisible();
    return this;
  }

  async seesShapeNote(note: string): Promise<this> {
    await expect(this.shapeCard().getByText(note, { exact: true })).toBeVisible();
    return this;
  }

  /** The radar draws the comparison's dashed shape once there is one. */
  async seesComparisonDrawn(drawn: boolean): Promise<this> {
    await expect(this.shapeCard().locator("[data-slot=radar-benchmark]")).toHaveCount(drawn ? 1 : 0);
    return this;
  }

  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    // A tap lower down scrolls the page; back at the top the fixed shell sits where it belongs.
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await expect(this.page).toHaveScreenshot(name, { fullPage: options.fullPage ?? true });
    return this;
  }
}

export const test = base.extend<{ lab: TheLabRobot }>({
  lab: async ({ page }, provide) => {
    await provide(new TheLabRobot(page));
  },
});
