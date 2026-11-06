import { fileURLToPath } from "node:url";
import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { SCANNED_COURSE_NAME, scannedCard } from "../../../testing/fixtures/scan";
import { expectTheme } from "../../../testing/theme";

const CARD_PHOTO = fileURLToPath(new URL("../../../../public/hero/physical-card.jpg", import.meta.url));
const CARD_NAME = "physical-card.jpg";
const DEMO_ALT = "A paper golf scorecard being scanned";

export class LandingRobot {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async dark(): Promise<this> {
    await this.page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    return this;
  }

  async open({ scanFails = false }: { scanFails?: boolean } = {}): Promise<this> {
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await FakeSession.install(this.page, { signedOut: true, scan: scanFails ? undefined : scannedCard });
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

  async openMenu(): Promise<this> {
    await this.page.getByRole("button", { name: "Toggle menu" }).click();
    return this;
  }

  /** The same toggle, tapped again with the menu open. */
  async closeMenu(): Promise<this> {
    return this.openMenu();
  }

  async seesHeadline(text: string): Promise<this> {
    await expect(this.page.getByRole("heading", { level: 1 })).toContainText(text);
    return this;
  }

  async seesMenuOpen(open: boolean): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Toggle menu" })).toHaveAttribute(
      "aria-expanded",
      String(open),
    );
    return this;
  }

  async seesScanner(): Promise<this> {
    await expect(this.page.getByText("Upload a scorecard photo")).toBeInViewport();
    return this;
  }

  async seesDemo(shown = true): Promise<this> {
    await expect(this.page.getByRole("img", { name: DEMO_ALT })).toHaveCount(shown ? 1 : 0);
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
    await expect(this.page.getByRole("alert")).toContainText("We couldn't scan this scorecard.");
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Scan my scorecard" })).toBeVisible();
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
    await expect(this.page.getByText(SCANNED_COURSE_NAME, { exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Scan another" })).toBeVisible();
    return this;
  }

  async goesTo(path: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`${path}$`));
    return this;
  }

  async tapSignUp(): Promise<this> {
    await this.page.getByRole("link", { name: "Sign Up", exact: true }).click();
    return this;
  }

  async capture(name: string): Promise<this> {
    // Tapping into the card scrolls the page; a full-page capture taken from
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ landing: LandingRobot }>({
  landing: async ({ page }, provide) => {
    await provide(new LandingRobot(page));
  },
});
