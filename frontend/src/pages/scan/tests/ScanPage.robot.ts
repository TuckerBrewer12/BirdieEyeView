import { fileURLToPath } from "node:url";
import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { scannedCard } from "../../../testing/fixtures/scan";

/** A real card photo, so the chosen file has something in its thumbnail. */
const CARD_PHOTO = fileURLToPath(new URL("../../../../public/hero/physical-card.jpg", import.meta.url));
const CARD_NAME = "physical-card.jpg";

/** Screen robot for `/scan` — same idea as an Android Espresso robot. */
export class ScanRobot {
  private readonly page: Page;
  private backend: FakeBackend | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /** The page's own title; the pinned header repeats it. */
  private title() {
    return this.page.locator("[data-slot=page-title]").filter({ hasText: "Scan Scorecard" });
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  /**
   * Opens the scan page signed in. By default any card scans as `scannedCard`; pass
   * `scan: undefined` for a scan the server can't read, or `holdScan` to watch one run.
   */
  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    // Manual entry's date defaults to today; a fixed day keeps its capture stable.
    await this.page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
    this.backend = await FakeSession.install(this.page, { scan: scannedCard, ...seed });
    await this.page.goto("/scan");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.title()).toBeVisible();
    return this;
  }

  /** The upload step, before a photo is picked. */
  async seesUpload(): Promise<this> {
    await expect(this.page.getByText("Drop your scorecard here")).toBeVisible();
    return this;
  }

  async chooseScorecard(): Promise<this> {
    await this.page.locator('input[type="file"]').setInputFiles(CARD_PHOTO);
    await expect(this.page.getByRole("button", { name: "Extract Scorecard" })).toBeVisible();
    return this;
  }

  /** The picked photo, as a thumbnail with its name, ready to scan. */
  async seesChosenCard(): Promise<this> {
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.locator('[data-slot=file-chip] img[src^="data:image/"]')).toBeVisible();
    return this;
  }

  async removeCard(): Promise<this> {
    await this.page.getByRole("button", { name: `Remove ${CARD_NAME}` }).click();
    return this;
  }

  /** The golfer's name, as it is written on the card. */
  async nameOnCard(name: string): Promise<this> {
    await this.page.getByPlaceholder("e.g. Tucker").fill(name);
    return this;
  }

  /** How the scores are written: total strokes, or against par. */
  async chooseScoring(format: "Total strokes" | "To par"): Promise<this> {
    await this.page.getByRole("button", { name: format }).click();
    return this;
  }

  /** The card has a putts row. */
  async puttsOnCard(): Promise<this> {
    await this.page.getByRole("button", { name: "Putts", exact: true }).click();
    await expect(this.page.getByText("Drag rows to match your card")).toBeVisible();
    return this;
  }

  async tapExtract(): Promise<this> {
    await this.page.getByRole("button", { name: "Extract Scorecard" }).click();
    return this;
  }

  /** The card being read, on its first phase. */
  async seesProcessing(): Promise<this> {
    await expect(
      this.page.locator("[data-slot=scan-progress]").filter({ hasText: "Reading course details…" }),
    ).toBeVisible();
    return this;
  }

  /** Lets a scan opened with `holdScan` answer. */
  async finishScan(): Promise<this> {
    this.backend?.finishScan();
    return this;
  }

  /** The scanned card, back to check before saving. */
  async seesReview(courseName: string): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Save Round" })).toBeVisible();
    await expect(this.page.getByText(courseName).first()).toBeVisible();
    return this;
  }

  async tapSave(): Promise<this> {
    await this.page.getByRole("button", { name: "Save Round" }).click();
    return this;
  }

  async tapStartOver(): Promise<this> {
    await this.page.getByRole("button", { name: "Start Over" }).click();
    return this;
  }

  async seesSaved(): Promise<this> {
    await expect(this.page.getByRole("heading", { name: "Round saved!" })).toBeVisible();
    return this;
  }

  async tapViewRound(): Promise<this> {
    await this.page.getByRole("button", { name: "View Round" }).click();
    return this;
  }

  async isAtSavedRound(): Promise<this> {
    await expect(this.page).toHaveURL(/\/rounds\/scanned-\d+$/);
    return this;
  }

  /** How many rounds the fake server holds that came from a scan. */
  async seesSavedRounds(count: number): Promise<this> {
    expect(this.backend?.store.savedScans).toHaveLength(count);
    return this;
  }

  /** The round just saved was linked to this course. */
  async seesSavedCourse(courseId: string): Promise<this> {
    expect(this.backend?.store.savedScans.at(-1)?.course_id).toBe(courseId);
    return this;
  }

  /** The scan went out with what the golfer said is on the card. */
  async seesScanContext(context: string): Promise<this> {
    await expect.poll(() => this.backend?.extractContexts.at(-1)).toBe(context);
    return this;
  }

  /** The review's course, linked to a saved one. */
  async seesLinkedCourse(name: string): Promise<this> {
    await expect(this.page.getByText("Linked", { exact: true })).toBeVisible();
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
    return this;
  }

  /** Saving failed: the reason shows, and the card is still there to save again. */
  async seesSaveFailed(message: string): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText(message);
    await expect(this.page.getByRole("button", { name: "Save Round" })).toBeEnabled();
    return this;
  }

  /** The scan failed: the reason shows, and the photo is still there to try again. */
  async seesScanFailed(): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText("We couldn't scan this scorecard.");
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Extract Scorecard" })).toBeVisible();
    return this;
  }

  async searchCourse(query: string): Promise<this> {
    await this.page.getByPlaceholder("Search courses…").fill(query);
    return this;
  }

  async pickCourse(name: string): Promise<this> {
    await this.page.locator("[data-slot=course-result]").filter({ hasText: name }).click();
    return this;
  }

  /** A course picked ahead of the scan. */
  async seesPresetCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Clear course" })).toBeVisible();
    return this;
  }

  async clearPresetCourse(): Promise<this> {
    await this.page.getByRole("button", { name: "Clear course" }).click();
    await expect(this.page.getByPlaceholder("Search courses…")).toBeVisible();
    return this;
  }

  async chooseManualEntry(): Promise<this> {
    await this.page.getByRole("button", { name: "Enter by hand" }).click();
    return this;
  }

  async chooseScanMode(): Promise<this> {
    await this.page.getByRole("button", { name: "Scan a card" }).click();
    return this;
  }

  /** The manual-entry form, before any scores. */
  async seesSetup(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Start Entering Scores" })).toBeVisible();
    await expect(this.page.getByText("Drop your scorecard here")).toHaveCount(0);
    return this;
  }

  /** Looks up a course on the manual-entry form. */
  async searchSetupCourse(query: string): Promise<this> {
    await this.page.getByPlaceholder("Search for a course by name...").fill(query);
    return this;
  }

  async pickSetupCourse(name: string): Promise<this> {
    await this.page.locator("ul").getByRole("button", { name }).click();
    return this;
  }

  /** Keeps the typed name when the search finds no course. */
  async keepTypedCourse(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Use "${name}"`, exact: true }).click();
    return this;
  }

  /** The course chosen for manual entry, picked or typed. */
  async seesSetupCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
    await expect(this.page.getByPlaceholder("Search for a course by name...")).toHaveCount(0);
    return this;
  }

  /** Chooses a tee. The control is a native select. */
  async chooseTee(color: string): Promise<this> {
    await this.page.getByRole("combobox").selectOption(color);
    return this;
  }

  async seesTee(color: string): Promise<this> {
    await expect(this.page.getByRole("combobox")).toHaveValue(color);
    return this;
  }

  /** Types one hole's strokes on the card being checked. */
  async typeStrokes(hole: number, strokes: number): Promise<this> {
    const nine = this.page.locator("table").nth(hole <= 9 ? 0 : 1);
    const scoreRow = nine.locator("tr").filter({
      has: this.page.getByRole("cell", { name: "Score", exact: true }),
    });
    await scoreRow.getByRole("textbox").nth((hole - 1) % 9).fill(String(strokes));
    return this;
  }

  /** The strokes kept for a hole on the round just saved. */
  async seesSavedStrokes(hole: number, strokes: number): Promise<this> {
    const saved = this.backend?.store.savedScans.at(-1);
    expect(saved?.hole_scores.find((score) => score.hole_number === hole)?.strokes).toBe(strokes);
    return this;
  }

  async startEntering(): Promise<this> {
    await this.page.getByRole("button", { name: "Start Entering Scores" }).click();
    return this;
  }

  /** A card with no scores yet, to type them into. */
  async seesBlankCard(): Promise<this> {
    await expect(this.page.getByText("Enter your scores hole by hole below")).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Save Round" })).toBeVisible();
    return this;
  }

  /** Leaves through the sidebar, as a golfer looking something up mid-scan would. */
  async leaveTo(label: string): Promise<this> {
    await this.page.getByRole("link", { name: label, exact: true }).click();
    await expect(this.title()).toHaveCount(0);
    return this;
  }

  async returnToScan(): Promise<this> {
    await this.page.getByRole("link", { name: "Scan Scorecard", exact: true }).click();
    return this;
  }

  /**
   * A full-page capture. The scan animation keeps moving under reduced motion, so a capture
   * of the processing step masks it: the card, and the corner brackets that pulse outside it.
   */
  async capture(name: string, { maskScanAnimation = false } = {}): Promise<this> {
    const animation = this.page.locator("[data-slot=scan-progress] > div").first();
    const mask = maskScanAnimation ? [animation, animation.locator(":scope > div")] : [];
    await expect(this.page).toHaveScreenshot(name, { fullPage: true, mask });
    return this;
  }
}

export const test = base.extend<{ scan: ScanRobot }>({
  scan: async ({ page }, provide) => {
    await provide(new ScanRobot(page));
  },
});
