import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { withoutRounds } from "../../../testing/fakes/analyticsResponses";
import { sampleGolfer } from "../../../testing/fixtures/sampleGolfer";
import type { AnalyticsFilters } from "../../../types/analytics";

// A few days after the sample golfer's last round, the way the analytics and dashboard robots see them.
const FROZEN_NOW = "2026-06-02T18:00:00.000Z";
// Ten months on: the sample golfer's March rounds now fall outside the last year.
const LATER = "2027-04-01T18:00:00.000Z";

type WindowLabel = "Lifetime" | "Last 365 Days";
type MilestoneTab = "Career" | "Putting" | "GIR";

/** Screen robot for /career. */
export class CareerRobot {
  private readonly page: Page;
  private backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * The page renders its phone and desktop layouts and CSS shows one, so every lookup takes
   * the copy on screen.
   */
  private shown(selector: string) {
    return this.page.locator(selector).filter({ visible: true });
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  private async install(seed: FakeBackendSeed, now = FROZEN_NOW): Promise<void> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await this.page.clock.setFixedTime(new Date(now));
    this.backend = await FakeSession.install(this.page, { ...sampleGolfer, ...seed });
    await this.page.goto("/career");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
  }

  /** The sample golfer's season: 24 rounds over three courses. */
  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.install(seed);
    await this.seesCareer();
    return this;
  }

  /** The same golfer, ten months after their last round. */
  async openLater(): Promise<this> {
    await this.install({}, LATER);
    await this.seesCareer();
    return this;
  }

  async openWithoutRounds(): Promise<this> {
    await this.install({ analytics: withoutRounds(sampleGolfer.analytics) });
    return this;
  }

  async openFailed(): Promise<this> {
    await this.install({ analytics: null });
    return this;
  }

  /** The next load succeeds, as the API would once the failure has cleared. */
  nextLoadSucceeds(): this {
    if (this.backend) this.backend.analytics = sampleGolfer.analytics;
    return this;
  }

  async seesCareer(): Promise<this> {
    await expect(this.shown("[data-slot=records-card]")).toBeVisible();
    return this;
  }

  async seesNoRoundsYet(): Promise<this> {
    await expect(this.page.getByText("Play some rounds to start your career record.")).toBeVisible();
    return this;
  }

  async seesLoadError(): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText("Analytics failed to load.");
    return this;
  }

  async retry(): Promise<this> {
    await this.page.getByRole("button", { name: "Retry" }).click();
    return this;
  }

  /** The career asked the server for these filters. */
  async askedFor(filters: Partial<AnalyticsFilters>): Promise<this> {
    await expect.poll(() => this.backend?.analyticsRequests.at(-1)).toMatchObject(filters);
    return this;
  }

  async pickWindow(label: WindowLabel): Promise<this> {
    await this.shown("[data-slot=career-window-picker]").getByRole("button", { name: label, exact: true }).click();
    return this;
  }

  async seesWindowPicked(label: WindowLabel): Promise<this> {
    await expect(
      this.shown("[data-slot=career-window-picker]").getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  private totals() {
    return this.shown("[data-slot=totals-card]");
  }

  async seesTotalsTitle(title: string): Promise<this> {
    await expect(this.totals().getByText(title, { exact: true })).toBeVisible();
    return this;
  }

  /** A total's tile: its label, then its count. */
  async seesTotal(label: string, value: string): Promise<this> {
    const tile = this.totals().locator("[data-slot=stat]").filter({ hasText: label });
    await expect(tile.locator("[data-slot=stat-label]")).toHaveText(label);
    await expect(tile.locator("[data-slot=stat-value]")).toHaveText(value);
    return this;
  }

  async seesNoTotal(label: string): Promise<this> {
    await expect(this.totals().locator("[data-slot=stat-label]").getByText(label, { exact: true })).toHaveCount(0);
    return this;
  }

  /** Taps one of the phone's milestone tabs. */
  async tapMilestoneTab(label: MilestoneTab): Promise<this> {
    await this.shown("[data-slot=milestone-tabs]").getByRole("button", { name: label, exact: true }).tap();
    return this;
  }

  /** The milestone card holding this title; on a phone, the one card under the tabs. */
  private milestones(title: string) {
    return this.shown("[data-slot=milestones-card]").filter({ hasText: title });
  }

  async seesMilestoneNote(title: string, note: string): Promise<this> {
    await expect(this.milestones(title).getByText(note, { exact: true })).toBeVisible();
    return this;
  }

  /** A milestone's row, reached or not. */
  async seesMilestone(title: string, label: string, achieved: boolean): Promise<this> {
    const row = this.milestones(title).locator("[data-slot=milestone-row]").filter({ hasText: label });
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute("data-achieved", String(achieved));
    return this;
  }

  async seesNoMilestone(title: string, label: string): Promise<this> {
    await expect(
      this.milestones(title).locator("[data-slot=milestone-row]").filter({ hasText: label }),
    ).toHaveCount(0);
    return this;
  }

  async openMilestone(title: string, label: string): Promise<this> {
    await this.milestones(title).getByRole("button", { name: new RegExp(`^${label}`) }).click();
    return this;
  }

  /** A record's row: its label, where and when it was set, and the figure. */
  async seesRecord(label: string, value: string): Promise<this> {
    const row = this.shown("[data-slot=records-card]").locator("[data-slot=record-row]").filter({ hasText: label });
    await expect(row).toContainText(value);
    return this;
  }

  async openRecord(label: string): Promise<this> {
    await this.shown("[data-slot=records-card]").getByRole("button", { name: new RegExp(`^${label}`) }).click();
    return this;
  }

  async isOnRound(roundId: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`/rounds/${roundId}$`));
    return this;
  }

  async capture(name: string, options: { fullPage?: boolean } = {}): Promise<this> {
    await this.page.waitForLoadState("networkidle");
    // A tap lower down scrolls the page; back at the top the fixed shell sits where it belongs.
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await expect(this.page).toHaveScreenshot(name, { fullPage: options.fullPage ?? true });
    return this;
  }
}

export const test = base.extend<{ career: CareerRobot }>({
  career: async ({ page }, provide) => {
    await provide(new CareerRobot(page));
  },
});

const events = sampleGolfer.analytics.notable_achievements;

/** The round the server marks lowest in the sample golfer's season. */
export const LOWEST_ROUND_ID = events.scoring_records_events.lifetime.lowest_round!.round_id!;

/** The round the sample golfer first broke 80 in. */
export const BREAK_80_ROUND_ID = events.round_milestones.lifetime.score_breaks.find((row) => row.threshold === 80)!
  .achievement!.round_id!;
