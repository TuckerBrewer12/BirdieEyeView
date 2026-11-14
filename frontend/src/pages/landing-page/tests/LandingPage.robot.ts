import { fileURLToPath } from "node:url";
import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend } from "../../../testing/fakes/FakeBackend";
import { SCANNED_COURSE_NAME, scannedCard } from "../../../testing/fixtures/scan";
import { expectTheme } from "../../../testing/theme";
import { fontsLoaded } from "../../../testing/fontsLoaded";

const CARD_PHOTO = fileURLToPath(new URL("../../../../public/hero/physical-card.jpg", import.meta.url));
const CARD_NAME = "physical-card.jpg";
const HERO_ALT = "A paper scorecard held over a golf cart";

export class LandingRobot {
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

  async open({ scanFails = false, reportStorage = false }: { scanFails?: boolean; reportStorage?: boolean } = {}): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    this.backend = await FakeSession.install(this.page, {
      signedOut: true,
      scan: scanFails ? undefined : scannedCard,
      reportStorage,
    });
    await this.page.goto("/");
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
    return this;
  }

  async reload(): Promise<this> {
    await this.page.reload();
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
    return this;
  }

  async tapThemeToggle(): Promise<this> {
    await this.page.getByRole("button", { name: "Toggle dark mode" }).click();
    return this;
  }

  async seesTheme(theme: "light" | "dark"): Promise<this> {
    await expectTheme(this.page, theme);
    return this;
  }

  async seesHeadline(text: string): Promise<this> {
    await expect(this.page.getByRole("heading", { level: 1 })).toContainText(text);
    return this;
  }

  async seesScanner(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Try it with a photo" })).toBeInViewport();
    return this;
  }

  async seesHeroPhoto(shown = true): Promise<this> {
    await expect(this.page.getByRole("img", { name: HERO_ALT })).toHaveCount(shown ? 1 : 0);
    if (shown) await expect(this.page.locator("[data-slot=scanner-demo]")).toContainText("1. Snap a photo");
    return this;
  }

  async chooseScorecard(): Promise<this> {
    await this.page.locator('input[type="file"]').setInputFiles(CARD_PHOTO);
    await expect(this.page.getByRole("button", { name: "Scan my scorecard" })).toBeVisible();
    return this;
  }

  async seesChosenCard(): Promise<this> {
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.locator('img[src^="data:image/"]')).toBeVisible();
    return this;
  }

  async seesScanFailed(): Promise<this> {
    await expect(this.page.getByRole("alert")).toContainText("Couldn't read this card.");
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Scan my scorecard" })).toBeVisible();
    return this;
  }

  async tapReportScan(): Promise<this> {
    await this.page.getByRole("group", { name: "Scan report" }).getByRole("button", { name: "Report failed scan" }).click();
    return this;
  }

  async seesReportSent(): Promise<this> {
    const report = this.page.getByRole("group", { name: "Scan report" });
    await expect(report.getByRole("button", { name: "Report sent" })).toBeDisabled();
    const sent = this.backend?.reportRequests ?? [];
    expect(sent).toHaveLength(1);
    expect(sent[0].metadata).not.toContain(CARD_NAME);
    return this;
  }

  async tapScan(): Promise<this> {
    await this.page.getByRole("button", { name: "Scan my scorecard" }).click();
    return this;
  }

  async tapScanAnother(): Promise<this> {
    const button = this.page.getByRole("button", { name: "Scan another" });
    await expect(button).toBeInViewport();
    await button.click();
    return this;
  }

  async seesScannedCard(): Promise<this> {
    await expect(this.page.getByRole("heading", { level: 1, name: "Here’s your round." })).toBeVisible();
    await expect(this.page.getByText(`${SCANNED_COURSE_NAME} ·`, { exact: false })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Scan another" })).toBeVisible();
    return this;
  }

  async goesTo(path: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`${path}$`));
    return this;
  }

  async tapSignUp(name: "Sign up" | "Sign up free" | "sign up free" = "Sign up"): Promise<this> {
    await this.page.getByRole("link", { name, exact: true }).click();
    return this;
  }

  async capture(name: string): Promise<this> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await fontsLoaded(this.page);
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ landing: LandingRobot }>({
  landing: async ({ page }, provide) => {
    await provide(new LandingRobot(page));
  },
});
