import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { withoutRounds } from "../../../testing/fakes/analyticsResponses";
import { sampleGolfer } from "../../../testing/fixtures/sampleGolfer";
import type { AnalyticsFilters } from "../../../domain/analyticsFilters";

// A few days after the sample golfer's last round, the way the demo tour sees them.
const FROZEN_NOW = "2026-06-02T18:00:00.000Z";

/** The charts draw themselves in, which `toHaveScreenshot` does not wait for. */
const CHARTS_DRAWN_MS = 2500;

type TabLabel = "Scoring" | "Ball Striking" | "Putting" | "Profile" | "Range View";

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

  /** The round count: the Rounds figure among the headline figures, on either layout. */
  private roundCount(count: number): Locator {
    return this.visible(
      this.page
        .getByText("Rounds", { exact: true })
        .locator("xpath=following-sibling::*[1]")
        .filter({ hasText: new RegExp(`^${count}$`) }),
    );
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  private async install(seed: FakeBackendSeed): Promise<void> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await this.page.clock.setFixedTime(new Date(FROZEN_NOW));
    this.backend = await FakeSession.install(this.page, { ...sampleGolfer, ...seed });
    await this.page.goto("/analytics");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
  }

  /** The sample golfer's season: 24 rounds over three courses. */
  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.install(seed);
    await this.seesRounds(24);
    return this;
  }

  /** A golfer with no rounds yet. */
  async openWithoutRounds(): Promise<this> {
    await this.install({ analytics: withoutRounds(sampleGolfer.analytics), playedCourses: [] });
    await this.seesNoRoundsYet();
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

  /** The course filter's menu, open. */
  async openCourseMenu(): Promise<this> {
    await this.visible(this.page.getByRole("combobox", { name: "Course" })).click();
    await expect(this.page.getByRole("listbox")).toBeVisible();
    await expect(this.page.locator("[data-slot=sort-menu]")).toBeVisible();
    return this;
  }

  /** Picks a course from the course filter's menu, on either layout. */
  async pickCourse(name: string): Promise<this> {
    await this.visible(this.page.getByRole("combobox", { name: "Course" })).click();
    await this.page.getByRole("option", { name, exact: true }).click();
    return this;
  }

  /** The best round's card opens that round. */
  async openBestRound(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: /Best Recent Round/ })).click();
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${BEST_ROUND_ID}$`));
    return this;
  }

  /** A par type in the range view: 3, 4 or 5. */
  async pickRangePar(par: 3 | 4 | 5): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: `Par ${par}`, exact: true })).click();
    return this;
  }

  /** A yardage band's card in the range view, by its band: "350–399". */
  async seesYardageBand(label: string): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=yardage-bucket-card]").getByText(label))).toBeVisible();
    return this;
  }

  async clearCourse(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Clear course filter" })).click();
    return this;
  }

  /** A timeframe or round-count pill in the filter bar: "YTD", "12 Mo", "10", "All"… */
  async pickRange(label: string): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: label, exact: true })).click();
    return this;
  }

  /** The last analytics request asked the server for these filters. */
  async askedFor(filters: Partial<AnalyticsFilters>): Promise<this> {
    await expect.poll(() => this.backend?.analyticsRequests.at(-1)).toMatchObject(filters);
    return this;
  }

  async seesNoMatchingRounds(): Promise<this> {
    await expect(this.visible(this.page.getByText("No rounds found for the selected filters."))).toBeVisible();
    return this;
  }

  async seesNoRoundsYet(): Promise<this> {
    await expect(this.visible(this.page.getByText("Play some rounds to see your analytics."))).toBeVisible();
    return this;
  }

  /** The phone's section tabs. */
  private sectionTab(label: TabLabel): Locator {
    return this.visible(this.page.getByRole("tablist", { name: "Section" })).getByRole("tab", {
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

  /** The open section leads with this sentence about the golfer's game. */
  async seesInsight(text: RegExp): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=insight-note]"))).toHaveText(text);
    return this;
  }

  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(CHARTS_DRAWN_MS);
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

/** The round the server marks lowest in the sample golfer's season. */
export const BEST_ROUND_ID = sampleGolfer.analytics.notable_achievements.scoring_records_events.lifetime.lowest_round!.round_id;
