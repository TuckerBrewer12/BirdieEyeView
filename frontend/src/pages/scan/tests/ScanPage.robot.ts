import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Download, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { scannedCard } from "../../../testing/fixtures/scan";
import { fontsLoaded } from "../../../testing/fontsLoaded";
import { captureOptions } from "../../../testing/fullPageCapture";

const CARD_PHOTO = fileURLToPath(new URL("../../../../public/hero/physical-card.jpg", import.meta.url));
const CARD_NAME = "physical-card.jpg";
const ANOTHER_PHOTO = { name: "another-card.jpg", mimeType: "image/jpeg", buffer: readFileSync(CARD_PHOTO) };

export class ScanRobot {
  private readonly page: Page;
  private backend: FakeBackend | null = null;
  private shared: Download | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  private title() {
    return this.page.locator("[data-slot=page-title]").filter({ hasText: /^Scan$/ });
  }

  private phone() {
    return (this.page.viewportSize()?.width ?? 1280) < 768;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open(seed: FakeBackendSeed = {}): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await this.page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
    this.backend = await FakeSession.install(this.page, { scan: scannedCard, ...seed });
    await this.page.goto("/scan");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.title()).toBeVisible();
    return this;
  }

  async seesUpload(): Promise<this> {
    await expect(
      this.phone()
        ? this.page.getByRole("button", { name: "Add scorecard photo" })
        : this.page.getByText("Drop a photo of your card"),
    ).toBeVisible();
    return this;
  }

  async chooseScorecard(): Promise<this> {
    await this.page.locator("[data-slot=dropzone] [data-slot=file-button-input], [data-slot=photo-source-library]").setInputFiles(CARD_PHOTO);
    await expect(this.readButton()).toBeVisible();
    return this;
  }

  private readButton() {
    return this.page.getByRole("button", { name: "Read card", exact: true });
  }

  async seesChosenCard(name: string = CARD_NAME): Promise<this> {
    await expect(this.page.getByText(name)).toBeVisible();
    await expect(this.page.locator('[data-slot=scan-photo] img[src^="data:image/"]')).toBeVisible();
    return this;
  }

  async chooseAnotherPhoto(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Try another photo" })).toBeVisible();
    await this.page.locator("[data-slot=file-button-input]").setInputFiles(ANOTHER_PHOTO);
    return this;
  }

  async chooseAnotherPhotoFromBanner(): Promise<this> {
    const banner = this.page.locator("[data-slot=scan-failed]");
    await expect(banner.getByRole("button", { name: "Try another photo" })).toBeVisible();
    await this.page.locator("[data-slot=file-button-input]").setInputFiles(ANOTHER_PHOTO);
    return this;
  }

  async markOnCard(row: string): Promise<this> {
    await this.page.getByRole("group", { name: "Also on the card" }).getByRole("checkbox", { name: row }).click();
    return this;
  }

  async seesRowOrder(rows: string[]): Promise<this> {
    const order = this.page.locator("[data-slot=card-row-order]");
    await expect(order.locator("[data-row-index]")).toHaveText(rows.map((row, i) => (i === 0 ? `Name${row}` : row)));
    return this;
  }

  async nameOnCard(name: string): Promise<this> {
    await this.page.getByRole("textbox", { name: "Your name on the card" }).fill(name);
    return this;
  }

  async scoresWrittenToPar(): Promise<this> {
    await this.page.getByRole("group", { name: "Scores written as" }).getByRole("button", { name: /^To par/ }).click();
    return this;
  }

  private rowOrder() {
    return this.page.locator("[data-slot=card-row-order]");
  }

  async dragRow(row: string, onto: string): Promise<this> {
    const order = this.rowOrder();
    await order.getByText(row, { exact: true }).dragTo(order.getByText(onto, { exact: true }));
    return this;
  }

  async dragNameTo(row: string): Promise<this> {
    const order = this.rowOrder();
    await order.getByText("Name", { exact: true }).dragTo(order.getByText(row, { exact: true }));
    return this;
  }

  async seesNameBeside(row: string): Promise<this> {
    await expect(this.rowOrder().locator("[data-row-index]").filter({ hasText: "Name" })).toContainText(row);
    return this;
  }

  async seesScanNote(note: string): Promise<this> {
    await expect.poll(() => this.backend?.scanRequests.at(-1)?.user_context).toBe(note);
    return this;
  }

  async seesNoScanFailure(): Promise<this> {
    await expect(this.page.locator("[data-slot=scan-failed]")).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: "Read card", exact: true })).toBeVisible();
    return this;
  }

  async tapExtract(): Promise<this> {
    await this.readButton().click();
    return this;
  }

  async seesProcessing(): Promise<this> {
    await expect(
      this.page.locator("[data-slot=scan-progress]").filter({ hasText: "Finding the course…" }),
    ).toBeVisible();
    return this;
  }

  async finishScan(): Promise<this> {
    this.backend?.finishScan();
    return this;
  }

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

  async seesSavedRounds(count: number): Promise<this> {
    expect(this.backend?.store.savedScans).toHaveLength(count);
    return this;
  }

  async seesSavedCourse(courseId: string): Promise<this> {
    expect(this.backend?.store.savedScans.at(-1)?.course_id).toBe(courseId);
    return this;
  }

  async seesLinkedCourse(name: string): Promise<this> {
    await expect(this.page.getByText("Linked", { exact: true })).toBeVisible();
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
    return this;
  }

  async seesSaveFailed(message: string): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText(message);
    await expect(this.page.getByRole("button", { name: "Save round" })).toBeEnabled();
    return this;
  }

  async seesScanFailed(): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText("Couldn't read this card.");
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Read card", exact: true })).toBeVisible();
    return this;
  }

  async tapReportScan(): Promise<this> {
    await this.page.getByRole("alert").getByRole("button", { name: "Report scan" }).click();
    return this;
  }

  async seesReportDisclaimer(): Promise<this> {
    const dialog = this.page.getByRole("alertdialog", { name: "Report this scan?" });
    await expect(dialog).toContainText("Nothing about your account goes with it.");
    expect(this.backend?.reportRequests ?? []).toHaveLength(0);
    return this;
  }

  async tapSendReport(): Promise<this> {
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Send report" }).click();
    return this;
  }

  async seesReportSent(): Promise<this> {
    await expect(this.page.getByRole("alertdialog")).toHaveCount(0);
    const sent = this.page.getByRole("alert").getByRole("button", { name: "Report sent" });
    await expect(sent).toHaveAttribute("aria-disabled", "true");
    await expect(sent).toBeFocused();
    const requests = this.backend?.reportRequests ?? [];
    expect(requests).toHaveLength(1);
    expect(JSON.parse(requests[0].metadata)).toMatchObject({ category: "extraction_failed", stage: "parse" });
    expect(requests[0].metadata).not.toContain(CARD_NAME);
    return this;
  }

  async seesReportStillSent(): Promise<this> {
    await expect(this.page.getByRole("alert").getByRole("button", { name: "Report sent" })).toBeVisible();
    return this;
  }

  async seesReportNotSaved(message: string): Promise<this> {
    const dialog = this.page.getByRole("alertdialog", { name: "Report this scan?" });
    await expect(dialog.getByRole("alert")).toHaveText(message);
    await expect(dialog.getByRole("button", { name: "Send report" })).toBeEnabled();
    return this;
  }

  async seesNoReport(): Promise<this> {
    await expect(this.page.getByRole("button", { name: /^Report (scan|sent)$/ })).toHaveCount(0);
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

  async seesSetup(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Enter scores" })).toBeVisible();
    await expect(this.page.getByText("Drop a photo of your card")).toHaveCount(0);
    return this;
  }

  async searchSetupCourse(query: string): Promise<this> {
    await this.setupSearch().fill(query);
    return this;
  }

  async pickSetupCourse(name: string): Promise<this> {
    await this.page.locator("[data-slot=course-result]").filter({ hasText: name }).click();
    return this;
  }

  async keepTypedCourse(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Save as “${name}”`, exact: true }).click();
    return this;
  }

  async seesSetupCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
    await expect(this.setupSearch()).toHaveCount(0);
    return this;
  }

  async changeSetupCourse(label: "Change course" | "Link course"): Promise<this> {
    await this.page.getByRole("button", { name: label }).click();
    return this;
  }

  async seesSetupSearch(query: string): Promise<this> {
    await expect(this.setupSearch()).toHaveValue(query);
    return this;
  }

  private setupSearch() {
    return this.page.getByRole("combobox", { name: /^Course/ });
  }

  async chooseTee(color: string): Promise<this> {
    await this.teeChip(color).click();
    return this;
  }

  async seesTee(color: string): Promise<this> {
    await expect(this.teeChip(color)).toHaveAttribute("aria-pressed", "true");
    return this;
  }

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
    return this.page
      .getByRole("group", { name: "Tee", exact: true })
      .getByRole("button", { name: new RegExp(`^${color}\\b`) });
  }

  private strokesCell(hole: number) {
    return this.page.getByRole("textbox", { name: new RegExp(`^Hole ${hole} strokes`) });
  }

  async typeStrokes(hole: number, strokes: number): Promise<this> {
    await this.strokesCell(hole).fill(String(strokes));
    await expect(this.strokesCell(hole)).toHaveValue(String(strokes));
    return this;
  }

  async typePutts(hole: number, putts: number): Promise<this> {
    await this.page.getByRole("textbox", { name: `Hole ${hole} putts`, exact: true }).fill(String(putts));
    return this;
  }

  async seesScoresToCheck(holes: number[]): Promise<this> {
    const count = holes.length === 1 ? "1 score to check" : `${holes.length} scores to check`;
    await expect(this.page.locator("[data-slot=scores-to-check]")).toContainText(count);
    await expect(this.page.locator("td[data-check]")).toHaveCount(holes.length);
    for (const hole of holes) {
      await expect(this.page.getByRole("textbox", { name: `Hole ${hole} strokes, to check` })).toBeVisible();
    }
    return this;
  }

  async seesNothingToCheck(): Promise<this> {
    await expect(this.page.locator("[data-slot=scores-to-check]")).toHaveCount(0);
    await expect(this.page.locator("td[data-check]")).toHaveCount(0);
    return this;
  }

  async seesRoundScore(score: number): Promise<this> {
    const scoreRow = this.page
      .locator("[data-slot=round-scorecard] tr")
      .filter({ has: this.page.locator("th", { hasText: /^Score$/ }) });
    await expect(scoreRow.locator("td").last()).toHaveText(String(score));
    return this;
  }

  async keepCardName(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Save as "${name}" without linking` }).click();
    await expect(this.page.getByText("Custom name · not linked to a course")).toBeVisible();
    return this;
  }

  async pickReviewTee(color: string): Promise<this> {
    await this.chooseTee(color);
    await this.seesTee(color);
    return this;
  }

  async typeReviewTee(tee: string): Promise<this> {
    return this.typeTee(tee);
  }

  async seesSavedTee(tee: string): Promise<this> {
    expect(this.backend?.store.savedScans.at(-1)?.tee_box).toBe(tee);
    return this;
  }

  async seesSavedStrokes(hole: number, strokes: number): Promise<this> {
    const saved = this.backend?.store.savedScans.at(-1);
    expect(saved?.hole_scores.find((score) => score.hole_number === hole)?.strokes).toBe(strokes);
    return this;
  }

  async seesSavedPutts(hole: number, putts: number): Promise<this> {
    const saved = this.backend?.store.savedScans.at(-1);
    expect(saved?.hole_scores.find((score) => score.hole_number === hole)?.putts).toBe(putts);
    return this;
  }

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

  async seesBlankCard(): Promise<this> {
    await expect(this.page.locator("[data-slot=page-title]").filter({ hasText: "Enter your scores" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Save round" })).toBeVisible();
    await expect(this.strokesCell(1)).toHaveValue("");
    return this;
  }

  async leaveTo(label: string): Promise<this> {
    await this.page.getByRole("link", { name: label, exact: true }).click();
    await expect(this.title()).toHaveCount(0);
    return this;
  }

  async returnToScan(): Promise<this> {
    await this.page.getByRole("link", { name: "Scan Scorecard", exact: true }).click();
    return this;
  }

  async capture(name: string, { maskScanAnimation = false } = {}): Promise<this> {
    const animation = this.page.locator("[data-slot=scan-progress] > div").first();
    const mask = maskScanAnimation ? [animation, animation.locator(":scope > div")] : [];
    await fontsLoaded(this.page);
    await expect(this.page).toHaveScreenshot(name, { ...captureOptions(), mask });
    return this;
  }
}

export const test = base.extend<{ scan: ScanRobot }>({
  scan: async ({ page }, provide) => {
    await provide(new ScanRobot(page));
  },
});
