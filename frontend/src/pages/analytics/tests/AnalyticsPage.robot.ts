import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { withoutRounds } from "../../../testing/fakes/analyticsResponses";
import { sampleGolfer } from "../../../testing/fixtures/sampleGolfer";
import type { AnalyticsFilters } from "../../../domain/analyticsFilters";

// A few days after the sample golfer's last round, the way the demo tour sees them.
const FROZEN_NOW = "2026-06-02T18:00:00.000Z";

type TabLabel = "Profile" | "Scoring" | "Ball striking" | "Putting" | "Approach";

/** Screen robot for /analytics. */
export class AnalyticsRobot {
  private readonly page: Page;
  private backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /** The control on screen: the desktop and phone layouts each render their own. */
  private visible(locator: Locator): Locator {
    return locator.locator("visible=true").first();
  }

  /** The round count beside the title: "24 rounds". */
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

  /** The sample golfer's season: 24 rounds over three courses. */
  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.install(seed);
    await this.seesRounds(24);
    return this;
  }

  /** The Lab's old address, which now lands on Profile. */
  async openLab(): Promise<this> {
    await this.install({}, "/the-lab");
    return this;
  }

  /** A golfer with no rounds yet. */
  async openWithoutRounds(): Promise<this> {
    await this.install({ analytics: withoutRounds(sampleGolfer.analytics), playedCourses: [] });
    return this;
  }

  /** Analytics fails to load. */
  async openFailed(): Promise<this> {
    await this.install({ analytics: null });
    await expect(this.page.getByRole("alert")).toBeVisible();
    return this;
  }

  /** The next load succeeds, as the API would once the failure has cleared. */
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

  /** The course filter's menu open: a dropdown on desktop, a bottom sheet on a phone. */
  async openCourseMenu(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Course", exact: true })).click();
    return this;
  }

  /** The course filter's menu, open. */
  async seesCourseMenu(): Promise<this> {
    await expect(this.page.locator("[data-slot=picker-options]")).toBeVisible();
    return this;
  }

  /** Picks a course from the course filter's menu, on either layout. */
  async pickCourse(name: string): Promise<this> {
    await this.openCourseMenu();
    await this.page
      .getByRole("menuitemradio", { name, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(name, { exact: true }))
      .click();
    return this;
  }

  /** A par type in Approach: 3, 4 or 5. */
  async pickApproachPar(par: 3 | 4 | 5): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: `Par ${par}`, exact: true })).click();
    return this;
  }

  /** A yardage band's card in Approach, by its band: "350–399". */
  async seesYardageBand(label: string): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=yardage-band]").getByText(label))).toBeVisible();
    return this;
  }

  /** The round count menu: "Last 10 rounds", "All rounds"… */
  async pickRoundCount(label: string): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Rounds", exact: true })).click();
    await this.page
      .getByRole("menuitemradio", { name: label, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(label, { exact: true }))
      .click();
    return this;
  }

  /** Gross or Net on the score trend. */
  async pickScoreReading(label: "Gross" | "Net"): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: label, exact: true })).click();
    return this;
  }

  async seesScoreTrend(label: "Score each round" | "Net score each round"): Promise<this> {
    await expect(this.visible(this.page.getByRole("img", { name: label }))).toBeVisible();
    return this;
  }

  /** The goal menu: "Break 85"… */
  async pickGoal(label: string): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Scoring goal" })).click();
    await this.page
      .getByRole("menuitemradio", { name: label, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(label, { exact: true }))
      .click();
    return this;
  }

  /** The goal was saved to the golfer's profile. */
  async seesGoalSaved(goal: number): Promise<this> {
    await expect.poll(() => this.backend?.profile?.scoring_goal).toBe(goal);
    return this;
  }

  /** The comparison menu: "10 handicap", a friend's name. */
  async compareWith(label: string): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Compare with" })).click();
    await this.page
      .getByRole("menuitemradio", { name: label, exact: true })
      .or(this.page.locator("[data-slot=sheet-option]").getByText(label, { exact: true }))
      .click();
    return this;
  }

  /** The radar's comparison, by name. */
  async seesComparedWith(name: string): Promise<this> {
    await expect(this.visible(this.page.getByRole("img", { name: `Your shape against ${name}` }))).toBeVisible();
    return this;
  }

  /** Where to find the strokes to the goal. */
  async seesSavers(heading: RegExp): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=savers]"))).toContainText(heading);
    return this;
  }

  async seesPeakGame(): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=peak-card]"))).toBeVisible();
    return this;
  }

  /** The last analytics request asked the server for these filters. */
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

  /** The page's section tabs. */
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

  /** The tab is selected, and its section shows this card's title. */
  async seesTabOpen(label: TabLabel, showing: string): Promise<this> {
    await expect(this.sectionTab(label)).toHaveAttribute("aria-selected", "true");
    await expect(this.visible(this.page.getByText(showing, { exact: true }))).toBeVisible();
    return this;
  }

  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    await expect(this.page).toHaveScreenshot(name, { fullPage: options.fullPage ?? true });
    return this;
  }
}

export const test = base.extend<{ analytics: AnalyticsRobot }>({
  analytics: async ({ page }, provide) => {
    await provide(new AnalyticsRobot(page));
  },
});

/** The course the sample golfer played least; the seed carries its own figures. */
export const LINKS = "Half Moon Bay Golf Links";
/** The seed has no figures for this course, so the fake answers as if no round there matched. */
export const UNSEEDED_COURSE = "Sharp Park Golf Course";
