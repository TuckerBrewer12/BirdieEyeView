import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { populatedFriendships } from "../../../testing/fixtures/friendships";
import { labAnalyticsByGolfer, labBenchmarks, labGoalReport, labUser } from "../../../testing/fixtures/lab";

type LabPanelLabel = "By Par" | "Putting" | "Peak";

/** The card each of the phone's panels shows. */
const PANEL_CARD: Record<LabPanelLabel, string> = {
  "By Par": "par-type-card",
  Putting: "putting-card",
  Peak: "peak-game-card",
};

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
      analyticsByGolfer: labAnalyticsByGolfer,
      benchmarks: labBenchmarks,
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
    return this.open({ analyticsByGolfer: {}, analytics: null });
  }

  /** The server comes back: the golfer's analytics load from here on. */
  async analyticsRecover(): Promise<this> {
    if (this.backend) this.backend.analyticsByGolfer = labAnalyticsByGolfer;
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

  /**
   * The page renders its phone and desktop layouts and CSS shows one, so every lookup takes
   * the copy on screen.
   */
  private shown(selector: string) {
    return this.page.locator(selector).filter({ visible: true });
  }

  private goalPicker() {
    return this.shown("[data-slot=goal-picker]");
  }

  /** Opens a menu (the goal, the comparison, the friend) and picks one of its options. */
  private async pickFrom(menu: Locator, label: string): Promise<void> {
    await menu.getByRole("combobox").click();
    await this.page.getByRole("option", { name: label, exact: true }).click();
  }

  async pickGoal(label: string): Promise<this> {
    await this.pickFrom(this.goalPicker(), label);
    return this;
  }

  async seesGoalPicked(label: string): Promise<this> {
    await expect(this.goalPicker().getByRole("combobox")).toHaveText(label);
    return this;
  }

  /** The goal standing card leads with the goal: "Break 85". */
  async seesGoalStanding(label: string): Promise<this> {
    await expect(this.shown("[data-slot=goal-standing]").getByText(label, { exact: true })).toBeVisible();
    return this;
  }

  async savedGoal(target: number): Promise<this> {
    await expect.poll(() => this.backend?.profile?.scoring_goal).toBe(target);
    return this;
  }

  /** Goal reports wait until `goalReportsArrive()`, as a slow server's would. */
  holdGoalReports(): this {
    this.backend?.holdGoalReports();
    return this;
  }

  goalReportsArrive(): this {
    this.backend?.finishGoalReports();
    return this;
  }

  /** The attempts card's count of rounds that met the goal: "1". */
  async seesTimesAchieved(count: string): Promise<this> {
    await expect(this.shown("[data-slot=attempts-card] [data-slot=stat-value]")).toHaveText(count);
    return this;
  }

  /** No attempts card: the goal's report, which marks each round, hasn't come yet. */
  async seesNoAttempts(): Promise<this> {
    await expect(this.shown("[data-slot=attempts-card]")).toHaveCount(0);
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
    await expect(this.shown("[data-slot=saver-card]").getByText(headline)).toBeVisible();
    return this;
  }

  private shapeCard() {
    return this.shown("[data-slot=performance-shape]");
  }

  async compareWith(label: string): Promise<this> {
    await this.pickFrom(this.shapeCard().locator("[data-slot=comparison-picker]"), label);
    return this;
  }

  async pickFriend(name: string): Promise<this> {
    await this.pickFrom(this.shapeCard().locator("[data-slot=friend-picker]"), name);
    return this;
  }

  /** The friend picker's menu, open. Comparing with a friend shows the picker. */
  async openFriendPicker(): Promise<this> {
    await this.shapeCard().locator("[data-slot=friend-picker]").getByRole("combobox").click();
    await expect(this.page.getByRole("listbox")).toBeVisible();
    await expect(this.page.locator("[data-slot=sort-menu]")).toBeVisible();
    return this;
  }

  async showShape(label: "Your Average" | "Peak Game"): Promise<this> {
    await this.shapeCard().getByRole("button", { name: label, exact: true }).click();
    return this;
  }

  /** The phone's Performance section: the panel tabs and the open panel. */
  private performance() {
    return this.shown("[data-slot=lab-performance]");
  }

  /** Taps one of the phone's panel tabs. The shape card's Peak Game control is a different button. */
  async tapPanel(label: LabPanelLabel): Promise<this> {
    await this.performance()
      .locator("[data-slot=lab-panels]")
      .getByRole("button", { name: label, exact: true })
      .tap();
    return this;
  }

  /** The phone shows this panel, and only this one. */
  async seesPanel(label: LabPanelLabel): Promise<this> {
    const tab = this.performance().locator("[data-slot=lab-panels]").getByRole("button", { name: label, exact: true });
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    for (const [other, slot] of Object.entries(PANEL_CARD)) {
      await expect(this.performance().locator(`[data-slot=${slot}]`)).toHaveCount(other === label ? 1 : 0);
    }
    return this;
  }

  /** The peak-versus-average bars on the phone's Peak panel. */
  async seesPeakBars(): Promise<this> {
    await expect(this.performance().getByText("Peak vs. average, a round", { exact: true })).toBeVisible();
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
