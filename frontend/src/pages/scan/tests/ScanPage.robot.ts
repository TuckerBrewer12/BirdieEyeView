import { fileURLToPath } from "node:url";
import { type Download, type Page } from "@playwright/test";
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
  private shared: Download | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /** The page's own title; the pinned header repeats it. */
  private title() {
    return this.page.locator("[data-slot=page-title]").filter({ hasText: /^Scan$/ });
  }

  /** A phone's screen: what's on the card first, the photo from a sheet, the actions pinned low. */
  private phone() {
    return (this.page.viewportSize()?.width ?? 1280) < 768;
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

  /** The upload step, before a photo is picked: the drop zone, or on a phone, the button that adds one. */
  async seesUpload(): Promise<this> {
    await expect(
      this.phone()
        ? this.page.getByRole("button", { name: "Add scorecard photo" })
        : this.page.getByText("Drop a photo of your card"),
    ).toBeVisible();
    return this;
  }

  /** Picks the card's photo: dropped on a computer, from the photo library on a phone. */
  async chooseScorecard(): Promise<this> {
    await this.page.locator("[data-slot=dropzone-input], [data-slot=photo-source-library]").setInputFiles(CARD_PHOTO);
    await expect(this.readButton()).toBeVisible();
    return this;
  }

  private readButton() {
    return this.page.getByRole("button", { name: /^Read card/ });
  }

  /** The picked photo, as a thumbnail with its name, ready to scan. */
  async seesChosenCard(): Promise<this> {
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.locator('[data-slot=scan-photo] img[src^="data:image/"]')).toBeVisible();
    return this;
  }

  async removeCard(): Promise<this> {
    await this.page.getByRole("button", { name: "Replace" }).click();
    return this;
  }

  async tapExtract(): Promise<this> {
    await this.readButton().click();
    return this;
  }

  /** The golfer's name as written on their row, so the scan reads that one. */
  async nameYourRow(name: string): Promise<this> {
    const field = this.page.getByRole("textbox", { name: "Your name on the card" });
    await field.fill(name);
    await expect(field).toHaveValue(name);
    return this;
  }

  /** The scores on the card are to par, not strokes. */
  async scoresWrittenToPar(): Promise<this> {
    const toPar = this.page
      .getByRole("group", { name: "Scores written as" })
      .getByRole("button", { name: /^To par/ });
    await toPar.click();
    await expect(toPar).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  /** Putts, or shots to green, are on the card too. */
  async alsoOnTheCard(row: "Putts" | "Shots to green"): Promise<this> {
    await this.page.getByRole("checkbox", { name: row, exact: true }).check();
    return this;
  }

  /** The note the scan was sent with: whose row, how the scores are written, which rows it has. */
  async seesScanNote(note: string): Promise<this> {
    await expect.poll(() => this.backend?.scanNotes.at(-1)).toBe(note);
    return this;
  }

  /** The card being read, on its first phase. */
  async seesProcessing(): Promise<this> {
    await expect(
      this.page.locator("[data-slot=scan-progress]").filter({ hasText: "Finding the course…" }),
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
    await expect(this.page.locator("[data-slot=page-title]").filter({ hasText: "Check your card" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Save round" })).toBeVisible();
    await expect(this.page.getByText(courseName).first()).toBeVisible();
    return this;
  }

  async tapSave(): Promise<this> {
    await this.page.getByRole("button", { name: "Save round" }).click();
    return this;
  }

  async tapStartOver(): Promise<this> {
    await this.page.getByRole("button", { name: "Start over" }).click();
    return this;
  }

  async seesSaved(): Promise<this> {
    await expect(this.page.getByRole("status").getByRole("heading", { name: "Round saved" })).toBeVisible();
    return this;
  }

  /** The saved round's score, and how it stood against par. */
  async seesSavedScore(score: number, toPar: string): Promise<this> {
    const saved = this.page.locator("[data-slot=scan-saved]");
    await expect(saved.locator("[data-slot=stat-value]")).toHaveText(String(score));
    await expect(saved.locator("[data-slot=to-par-pill]")).toHaveText(toPar);
    return this;
  }

  /**
   * Shares the saved round. The test browser has no share sheet, so the image comes down as a
   * file instead.
   */
  async tapShare(): Promise<this> {
    const download = this.page.waitForEvent("download");
    await this.page.getByRole("button", { name: "Share" }).click();
    this.shared = await download;
    return this;
  }

  /** The round went out as an image named for its course. */
  async seesSharedImage(fileName: string): Promise<this> {
    expect(this.shared?.suggestedFilename()).toBe(fileName);
    await expect(this.page.getByRole("button", { name: "Share" })).toBeEnabled();
    return this;
  }

  async tapScanAnother(): Promise<this> {
    await this.page.getByRole("button", { name: "Scan another" }).click();
    return this;
  }

  async tapViewRound(): Promise<this> {
    await this.page.getByRole("button", { name: "View round" }).click();
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

  /** The review's course, linked to a saved one. */
  async seesLinkedCourse(name: string): Promise<this> {
    await expect(this.page.getByText("Linked", { exact: true })).toBeVisible();
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
    return this;
  }

  /** Saving failed: the reason shows, and the card is still there to save again. */
  async seesSaveFailed(message: string): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText(message);
    await expect(this.page.getByRole("button", { name: "Save round" })).toBeEnabled();
    return this;
  }

  /** The scan failed: the reason shows, and the photo is still there to try again. */
  async seesScanFailed(): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText("Couldn't read this card.");
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Read card again" })).toBeVisible();
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
    await this.page.getByRole("button", { name: "By hand" }).click();
    return this;
  }

  async chooseScanMode(): Promise<this> {
    await this.page.getByRole("button", { name: "Photo", exact: true }).click();
    return this;
  }

  /** The manual-entry form, before any scores. */
  async seesSetup(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Enter scores" })).toBeVisible();
    await expect(this.page.getByText("Drop a photo of your card")).toHaveCount(0);
    return this;
  }

  /** Looks up a course on the manual-entry form. */
  async searchSetupCourse(query: string): Promise<this> {
    await this.setupSearch().fill(query);
    return this;
  }

  async pickSetupCourse(name: string): Promise<this> {
    await this.page.locator("[data-slot=course-result]").filter({ hasText: name }).click();
    return this;
  }

  /** Keeps the typed name for a course the search doesn't have. */
  async keepTypedCourse(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Save as “${name}”`, exact: true }).click();
    return this;
  }

  /** The course chosen for manual entry, picked or typed. */
  async seesSetupCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
    await expect(this.setupSearch()).toHaveCount(0);
    return this;
  }

  /** Opens the search again from the chosen course. */
  async changeSetupCourse(label: "Change course" | "Link course"): Promise<this> {
    await this.page.getByRole("button", { name: label }).click();
    return this;
  }

  /** The manual-entry search, open on this query. */
  async seesSetupSearch(query: string): Promise<this> {
    await expect(this.setupSearch()).toHaveValue(query);
    return this;
  }

  private setupSearch() {
    return this.page.getByRole("combobox", { name: /^Course/ });
  }

  /** Picks a tee from the chosen course's tees. */
  async chooseTee(color: string): Promise<this> {
    await this.teeChip(color).click();
    return this;
  }

  async seesTee(color: string): Promise<this> {
    await expect(this.teeChip(color)).toHaveAttribute("aria-pressed", "true");
    return this;
  }

  /** Types the tee, when the course has no tees to pick from. */
  async typeTee(tee: string): Promise<this> {
    await this.teeField().fill(tee);
    return this;
  }

  async seesTypedTee(tee: string): Promise<this> {
    await expect(this.teeField()).toHaveValue(tee);
    return this;
  }

  private teeField() {
    return this.page.getByRole("textbox", { name: "Tee", exact: true });
  }

  private teeChip(color: string) {
    return this.page.getByRole("group", { name: "Tee", exact: true }).getByRole("button", { name: color, exact: true });
  }

  /** A hole's strokes cell on the card being checked, ringed or not. */
  private strokesCell(hole: number) {
    return this.page.getByRole("textbox", { name: new RegExp(`^Hole ${hole} strokes`) });
  }

  /** Types one hole's strokes on the card being checked. */
  async typeStrokes(hole: number, strokes: number): Promise<this> {
    await this.strokesCell(hole).fill(String(strokes));
    await expect(this.strokesCell(hole)).toHaveValue(String(strokes));
    return this;
  }

  /** Types one hole's putts on the card being checked. */
  async typePutts(hole: number, putts: number): Promise<this> {
    await this.page.getByRole("textbox", { name: `Hole ${hole} putts`, exact: true }).fill(String(putts));
    return this;
  }

  /** The scores the scan wasn't sure of: counted above the card, and ringed on it. */
  async seesScoresToCheck(holes: number[]): Promise<this> {
    const count = holes.length === 1 ? "1 score to check" : `${holes.length} scores to check`;
    await expect(this.page.locator("[data-slot=scores-to-check]")).toContainText(count);
    await expect(this.page.locator("td[data-check]")).toHaveCount(holes.length);
    for (const hole of holes) {
      await expect(this.page.getByRole("textbox", { name: `Hole ${hole} strokes, to check` })).toBeVisible();
    }
    return this;
  }

  /** Nothing on the card is in doubt. */
  async seesNothingToCheck(): Promise<this> {
    await expect(this.page.locator("[data-slot=scores-to-check]")).toHaveCount(0);
    await expect(this.page.locator("td[data-check]")).toHaveCount(0);
    return this;
  }

  /** The round's score so far, as the card being checked adds up. */
  async seesRoundScore(score: number): Promise<this> {
    const scoreRow = this.page
      .locator("[data-slot=round-scorecard] tr")
      .filter({ has: this.page.locator("th", { hasText: /^Score$/ }) });
    // The card's Tot: the last cell of its Score row.
    await expect(scoreRow.locator("td").last()).toHaveText(String(score));
    return this;
  }

  /** Saves the round under the name read off the card, without linking a course. */
  async keepCardName(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Save as "${name}" without linking` }).click();
    await expect(this.page.getByText("Custom name · not linked to a course")).toBeVisible();
    return this;
  }

  /** Picks the tee played from the chips the card's or the linked course's tees offer. */
  async pickReviewTee(color: string): Promise<this> {
    await this.chooseTee(color);
    await this.seesTee(color);
    return this;
  }

  /** Types the tee played, when there are no tees to pick from. */
  async typeReviewTee(tee: string): Promise<this> {
    return this.typeTee(tee);
  }

  /** The tee kept on the round just saved. */
  async seesSavedTee(tee: string): Promise<this> {
    expect(this.backend?.store.savedScans.at(-1)?.tee_box).toBe(tee);
    return this;
  }

  /** The strokes kept for a hole on the round just saved. */
  async seesSavedStrokes(hole: number, strokes: number): Promise<this> {
    const saved = this.backend?.store.savedScans.at(-1);
    expect(saved?.hole_scores.find((score) => score.hole_number === hole)?.strokes).toBe(strokes);
    return this;
  }

  /** The putts kept for a hole on the round just saved. */
  async seesSavedPutts(hole: number, putts: number): Promise<this> {
    const saved = this.backend?.store.savedScans.at(-1);
    expect(saved?.hole_scores.find((score) => score.hole_number === hole)?.putts).toBe(putts);
    return this;
  }

  /** The round just saved kept this name and no linked course. */
  async seesSavedCourseName(name: string): Promise<this> {
    const saved = this.backend?.store.savedScans.at(-1);
    expect(saved?.course_id ?? null).toBeNull();
    expect(saved?.course_name).toBe(name);
    return this;
  }

  async startEntering(): Promise<this> {
    await this.page.getByRole("button", { name: "Enter scores" }).click();
    return this;
  }

  /** A card with no scores yet, to type them into. */
  async seesBlankCard(): Promise<this> {
    await expect(this.page.locator("[data-slot=page-title]").filter({ hasText: "Enter your scores" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Save round" })).toBeVisible();
    await expect(this.strokesCell(1)).toHaveValue("");
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
