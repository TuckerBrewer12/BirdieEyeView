import { fileURLToPath } from "node:url";
import { type Download, type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend, FakeBackendSeed } from "../../../testing/fakes/FakeBackend";
import { scannedCard } from "../../../testing/fixtures/scan";

const CARD_PHOTO = fileURLToPath(new URL("../../../../public/hero/physical-card.jpg", import.meta.url));
const CARD_NAME = "physical-card.jpg";

export class ScanRobot {
  private readonly page: Page;
  private backend: FakeBackend | null = null;
  private shared: Download | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  private title() {
    return this.page.locator("[data-slot=page-title]").filter({ hasText: "Scan Scorecard" });
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
    await expect(this.page.getByText("Drop your scorecard here")).toBeVisible();
    return this;
  }

  async chooseScorecard(): Promise<this> {
    await this.page.locator('input[type="file"]').setInputFiles(CARD_PHOTO);
    await expect(this.page.getByRole("button", { name: "Extract Scorecard" })).toBeVisible();
    return this;
  }

  async seesChosenCard(): Promise<this> {
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.locator('[data-slot=file-chip] img[src^="data:image/"]')).toBeVisible();
    return this;
  }

  async removeCard(): Promise<this> {
    await this.page.getByRole("button", { name: `Remove ${CARD_NAME}` }).click();
    return this;
  }

  async tapExtract(): Promise<this> {
    await this.page.getByRole("button", { name: "Extract Scorecard" }).click();
    return this;
  }

  async seesProcessing(): Promise<this> {
    await expect(
      this.page.locator("[data-slot=scan-progress]").filter({ hasText: "Reading course details…" }),
    ).toBeVisible();
    return this;
  }

  async finishScan(): Promise<this> {
    this.backend?.finishScan();
    return this;
  }

  async seesReview(courseName: string): Promise<this> {
    await expect(this.page.locator("[data-slot=page-title]").filter({ hasText: "Check your card" })).toBeVisible();
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

  async seesSavedScore(score: number, toPar: string): Promise<this> {
    const saved = this.page.locator("[data-slot=scan-saved]");
    await expect(saved.locator("[data-slot=stat-value]")).toHaveText(String(score));
    await expect(saved.locator("[data-slot=to-par-figure]")).toHaveText(toPar);
    return this;
  }

  async tapShare(): Promise<this> {
    const download = this.page.waitForEvent("download");
    await this.page.getByRole("button", { name: "Share Round" }).click();
    this.shared = await download;
    return this;
  }

  async seesSharedImage(fileName: string): Promise<this> {
    expect(this.shared?.suggestedFilename()).toBe(fileName);
    await expect(this.page.getByRole("button", { name: "Share Round" })).toBeEnabled();
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
    await expect(this.page.getByRole("button", { name: "Save Round" })).toBeEnabled();
    return this;
  }

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

  async seesSetup(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Start Entering Scores" })).toBeVisible();
    await expect(this.page.getByText("Drop your scorecard here")).toHaveCount(0);
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
    await this.page.getByRole("button", { name: `Save as "${name}"`, exact: true }).click();
    return this;
  }

  async seesSetupCourse(name: string): Promise<this> {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
    await expect(this.setupSearch()).toHaveCount(0);
    return this;
  }

  async changeSetupCourse(label: "Change course" | "Edit name"): Promise<this> {
    await this.page.getByRole("button", { name: label }).click();
    return this;
  }

  async seesSetupSearch(query: string): Promise<this> {
    await expect(this.setupSearch()).toHaveValue(query);
    return this;
  }

  private setupSearch() {
    return this.page.getByRole("searchbox", { name: "Course (optional)" });
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
    return this.page.getByRole("textbox", { name: "Tee played" });
  }

  private teeChip(color: string) {
    return this.page.getByRole("group", { name: "Tee played" }).getByRole("button", { name: color, exact: true });
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
    await expect(
      this.page.locator("[data-slot=stat]").filter({ hasText: /^Score/ }).locator("[data-slot=stat-value]"),
    ).toHaveText(String(score));
    return this;
  }

  async keepCardName(name: string): Promise<this> {
    await this.page.getByRole("button", { name: `Save as "${name}" without linking →` }).click();
    await expect(this.page.getByText("Saving without a linked course")).toBeVisible();
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
    await this.page.getByRole("button", { name: "Start Entering Scores" }).click();
    return this;
  }

  async seesBlankCard(): Promise<this> {
    await expect(this.page.locator("[data-slot=page-title]").filter({ hasText: "Enter your scores" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Save Round" })).toBeVisible();
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
    await expect(this.page).toHaveScreenshot(name, { fullPage: true, mask });
    return this;
  }
}

export const test = base.extend<{ scan: ScanRobot }>({
  scan: async ({ page }, provide) => {
    await provide(new ScanRobot(page));
  },
});
