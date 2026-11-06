import { type Locator, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { withoutRounds } from "../../../testing/fakes/analyticsResponses";
import { sampleGolfer } from "../../../testing/fixtures/sampleGolfer";
import type { AnalyticsFilters } from "../../../domain/analyticsFilters";

const FROZEN_NOW = "2026-06-02T18:00:00.000Z";

type TabLabel = "Scoring" | "Ball Striking" | "Putting" | "Profile" | "Range View";

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

  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.install(seed);
    await this.seesRounds(24);
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
    await this.visible(this.page.getByRole("combobox", { name: "Course" })).click();
    return this;
  }

  async seesCourseMenu(): Promise<this> {
    await expect(this.page.getByRole("listbox")).toBeVisible();
    await expect(this.page.locator("[data-slot=sort-menu]")).toBeVisible();
    return this;
  }

  async pickCourse(name: string): Promise<this> {
    await this.visible(this.page.getByRole("combobox", { name: "Course" })).click();
    await this.page.getByRole("option", { name, exact: true }).click();
    return this;
  }

  async openBestRound(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: /Best Recent Round/ })).click();
    return this;
  }

  async isAtRound(id: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${id}$`));
    return this;
  }

  async pickRangePar(par: 3 | 4 | 5): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: `Par ${par}`, exact: true })).click();
    return this;
  }

  async seesYardageBand(label: string): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=yardage-bucket-card]").getByText(label))).toBeVisible();
    return this;
  }

  async clearCourse(): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: "Clear course filter" })).click();
    return this;
  }

  async pickRange(label: string): Promise<this> {
    await this.visible(this.page.getByRole("button", { name: label, exact: true })).click();
    return this;
  }

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

  private sectionTab(label: TabLabel): Locator {
    return this.visible(this.page.getByRole("group", { name: "Section" })).getByRole("button", {
      name: label,
      exact: true,
    });
  }

  async openTab(label: TabLabel): Promise<this> {
    await this.sectionTab(label).click();
    return this;
  }

  async seesTabOpen(label: TabLabel, showing: string): Promise<this> {
    await expect(this.sectionTab(label)).toHaveAttribute("aria-pressed", "true");
    await expect(this.visible(this.page.getByText(showing, { exact: true }))).toBeVisible();
    return this;
  }

  async seesInsight(text: RegExp): Promise<this> {
    await expect(this.visible(this.page.locator("[data-slot=insight-note]"))).toHaveText(text);
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

export const LINKS = "Half Moon Bay Golf Links";
export const UNSEEDED_COURSE = "Sharp Park Golf Course";

export const BEST_ROUND_ID = sampleGolfer.analytics.notable_achievements.scoring_records_events.lifetime.lowest_round!.round_id;
