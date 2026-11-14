import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { withoutRounds } from "../../../testing/fakes/analyticsResponses";
import { sampleGolfer } from "../../../testing/fixtures/sampleGolfer";
import { avery, friendshipsOf } from "../../../testing/fixtures/friendships";
import type { AnalyticsFilters } from "../../../domain/analyticsFilters";
import { fontsLoaded } from "../../../testing/fontsLoaded";

const FROZEN_NOW = "2026-06-02T18:00:00.000Z";

type TabLabel = "Profile" | "Scoring" | "Ball striking" | "Putting" | "Approach";

export class AnalyticsRobot {
  private readonly page: Page;
  private backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  private visible(locator: Locator): Locator {
    return locator.locator("visible=true").first();
  }

  private roundCount(count: number): Locator {
    return this.visible(this.page.getByText(new RegExp(`^${count} rounds?$`)));
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  private async install(seed: FakeBackendSeed, path = "/analytics"): Promise<void> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await this.page.clock.setFixedTime(new Date(FROZEN_NOW));
    this.backend = await FakeSession.install(this.page, { ...sampleGolfer, ...seed });
    await this.page.goto(path);
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
  }

  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.install(seed);
    await this.seesRounds(24);
    return this;
  }

  async openLab(): Promise<this> {
    await this.install({}, "/the-lab");
    return this;
  }

  async openWithFriends(path = "/analytics"): Promise<this> {
    const me = sampleGolfer.profile;
    await this.install({
      friends: { friendships: friendshipsOf({ id: me.id, name: me.name, email: me.email }) },
      benchmarks: {
        ...sampleGolfer.benchmarks,
        [`friend:${avery.id}`]: { ...sampleGolfer.benchmarks["handicap:10"], against: "friend", handicap: null },
      },
    }, path);
    await this.seesRounds(24);
    return this;
  }

  async openWithoutGoal(): Promise<this> {
    await this.install({ profile: { ...sampleGolfer.profile, scoring_goal: null } });
    await this.seesRounds(24);
    return this;
  }

  async openWithProfileFailing(): Promise<this> {
    await this.install({ analyticsFailsAtLimit: 20 });
    await this.seesRounds(24);
    return this;
  }

  profileLoadsNext(): this {
    if (this.backend) this.backend.analyticsFailsAtLimit = null;
    return this;
  }

  async seesProfileError(): Promise<this> {
    await expect(this.visible(this.page.getByRole("alert"))).toContainText("Could not load your profile.");
    return this;
  }

  async openWithoutRounds(): Promise<this> {
    await this.install({ analytics: withoutRounds(sampleGolfer.analytics), playedCourses: [] });
    return this;
  }

  async openFailed(): Promise<this> {
    await this.install({ analytics: null });
    await expect(this.page.getByRole("alert")).toBeVisible();
    return this;
  }

  nextLoadSucceeds(): this {
    if (this.backend) this.backend.analytics = sampleGolfer.analytics;
    return this;
  }

  async retry(): Promise<this> {
    await this.page.getByRole("button", { name: "Retry" }).click();
    return this;
  }

  async seesLoadError(): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText("Analytics failed to load.");
    return this;
  }

  async seesRounds(count: number): Promise<this> {
    await expect(this.roundCount(count)).toBeVisible();
    return this;
  }

  async openCourseMenu(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Course", exact: true })).click();
    return this;
  }

  async seesCourseMenu(): Promise<this> {
    await expect(this.page.locator("[data-slot=picker-options]")).toBeVisible();
    return this;
  }

  async pickCourse(name: string): Promise<this> {
    await this.openCourseMenu();
    await this.page
      .getByRole("menuitemradio", { name, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(name, { exact: true }))
      .click();
    return this;
  }

  async pickApproachPar(par: 3 | 4 | 5): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: `Par ${par}`, exact: true })).click();
    return this;
  }

  async seesYardageBand(label: string): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=yardage-band]").getByText(label))).toBeVisible();
    return this;
  }

  async openRoundsMenu(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Rounds", exact: true })).click();
    return this;
  }

  async seesMenuOpen(): Promise<this> {
    await expect(this.page.locator("[data-slot=picker-options]")).toBeVisible();
    return this;
  }

  async pickRoundCount(label: string): Promise<this> {
    await this.openRoundsMenu();
    await this.page
      .getByRole("menuitemradio", { name: label, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(label, { exact: true }))
      .click();
    return this;
  }

  async pickScoreReading(label: "Gross" | "Net"): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: label, exact: true })).click();
    return this;
  }

  async toggleLine(label: string): Promise<this> {
    await this.visible(this.page.getByRole("group", { name: "Show" }).getByRole("button", { name: label, exact: true })).click();
    return this;
  }

  async seesScoreLine(shown: boolean): Promise<this> {
    await expect(this.page.locator("[data-slot=trend-area-reference]")).toHaveCount(shown ? 1 : 0);
    return this;
  }

  async showFewerRounds(rounds: number): Promise<this> {
    const slider = this.visible(this.page.getByRole("slider", { name: "Rounds shown" }));
    for (let i = 0; i < rounds; i++) await slider.press("ArrowLeft");
    return this;
  }

  async seesRoundsShown(label: string): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=slider]")).first()).toContainText(label);
    return this;
  }

  async seesCountLines(count: number): Promise<this> {
    await expect(this.page.locator("[data-slot=trend-area-count]")).toHaveCount(count);
    return this;
  }

  async seesScoreTrend(label: "Score each round" | "Net score each round"): Promise<this> {
    await expect(this.visible(this.page.getByRole("img", { name: label }))).toBeVisible();
    return this;
  }

  async openGoalMenu(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Scoring goal" })).click();
    return this;
  }

  async seesNoGoal(): Promise<this> {
    await expect(this.visible(this.page.getByText("Pick a score to break and see how far off it you are."))).toBeVisible();
    return this;
  }

  async pickGoal(label: string): Promise<this> {
    await this.openGoalMenu();
    await this.page
      .getByRole("menuitemradio", { name: label, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(label, { exact: true }))
      .click();
    return this;
  }

  async seesGoalSaved(goal: number): Promise<this> {
    await expect.poll(() => this.backend?.profile?.scoring_goal).toBe(goal);
    return this;
  }

  failSavesWith(detail: string): this {
    if (this.backend) this.backend.updateUserError = detail;
    return this;
  }

  async seesGoalNotSaved(message: string): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=goal-card]").getByRole("alert"))).toHaveText(message);
    return this;
  }

  async openCompareMenu(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Compare with" })).click();
    return this;
  }

  async seesFriendNote(text: RegExp): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=shape-card]"))).toContainText(text);
    return this;
  }

  async compareWith(label: string): Promise<this> {
    await this.openCompareMenu();
    await this.page
      .getByRole("menuitemradio", { name: label, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(label, { exact: true }))
      .click();
    return this;
  }

  async seesComparedWith(name: string): Promise<this> {
    await expect(this.visible(this.page.getByRole("img", { name: `Your shape against ${name}` }))).toBeVisible();
    return this;
  }

  async seesSavers(heading: RegExp): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=savers]"))).toContainText(heading);
    return this;
  }

  async seesPeakGame(lead: RegExp, rows: string[]): Promise<this> {
    const card = this.visible(this.page.locator("[data-slot=peak-card]"));
    await expect(card).toContainText(lead);
    await expect(card.locator("[data-slot=peak-row]")).toHaveText(rows.map((row) => new RegExp(`^${row}`)));
    return this;
  }

  async askedFor(filters: Partial<AnalyticsFilters>): Promise<this> {
    await expect.poll(() => this.backend?.analyticsRequests.at(-1)).toMatchObject(filters);
    return this;
  }

  async seesNoMatchingRounds(): Promise<this> {
    await expect(this.visible(this.page.getByText("No rounds at this course yet."))).toBeVisible();
    return this;
  }

  async seesNoRoundsYet(): Promise<this> {
    await expect(this.visible(this.page.getByText("Play some rounds to see your analytics."))).toBeVisible();
    return this;
  }

  private sectionTab(label: TabLabel): Locator {
    return this.visible(this.page.getByRole("tablist", { name: "Analytics sections" })).getByRole("tab", {
      name: label,
      exact: true,
    });
  }

  async openTab(label: TabLabel): Promise<this> {
    await this.sectionTab(label).click();
    return this;
  }

  async seesTabOpen(label: TabLabel, showing: string): Promise<this> {
    await expect(this.sectionTab(label)).toHaveAttribute("aria-selected", "true");
    await expect(this.visible(this.page.getByText(showing, { exact: true }))).toBeVisible();
    return this;
  }

  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    await fontsLoaded(this.page);
    await expect(this.page).toHaveScreenshot(name, { fullPage: options.fullPage ?? true });
    return this;
  }
}

export const test = base.extend<{ analytics: AnalyticsRobot }>({
  analytics: async ({ page }, provide) => {
    await provide(new AnalyticsRobot(page));
  },
});

export const LINKS = "Half Moon Bay Golf Links";
export const UNSEEDED_COURSE = "Sharp Park Golf Course";
