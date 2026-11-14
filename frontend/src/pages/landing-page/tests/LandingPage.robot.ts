import { fileURLToPath } from "node:url";
import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import type { FakeBackend } from "../../../testing/fakes/FakeBackend";
import { SCANNED_COURSE_NAME, scannedCard } from "../../../testing/fixtures/scan";
import { expectTheme } from "../../../testing/theme";
import { fontsLoaded } from "../../../testing/fontsLoaded";

/** The photo the hero shows, so an upload has a real card in its preview. */
const CARD_PHOTO = fileURLToPath(new URL("../../../../public/hero/physical-card.jpg", import.meta.url));
const CARD_NAME = "physical-card.jpg";
const HERO_ALT = "A paper scorecard held over a golf cart";

/** Screen robot for the logged-out landing page at `/`. */
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

  /**
   * `scanFails`: the scan endpoint errors, as it does when the server can't read a card.
   * `reportStorage`: a failed scan's report is saved; unset, reporting isn't set up.
   */
  async open({ scanFails = false, reportStorage = false }: { scanFails?: boolean; reportStorage?: boolean } = {}): Promise<this> {
    // Reduced motion settles the hero's entrance at once, so a capture never
    // catches it mid-fade. `test.use({ reducedMotion })` does not reach the page.
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

  /** Reloads the page, as a returning visitor would see it. */
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

  /** "Try it with a photo" sits in the first screen, not below the fold. */
  async seesScanner(): Promise<this> {
    await expect(this.page.getByRole("button", { name: "Try it with a photo" })).toBeInViewport();
    return this;
  }

  /** The hero's scanner demo, holding on its photo of a card (reduced motion stops the loop). */
  async seesHeroPhoto(shown = true): Promise<this> {
    await expect(this.page.getByRole("img", { name: HERO_ALT })).toHaveCount(shown ? 1 : 0);
    if (shown) await expect(this.page.locator("[data-slot=scanner-demo]")).toContainText("1. Snap a photo");
    return this;
  }

  /** Picks a photo. The visitor is still on the upload step, choosing what's on the card. */
  async chooseScorecard(): Promise<this> {
    await this.page.locator('input[type="file"]').setInputFiles(CARD_PHOTO);
    await expect(this.page.getByRole("button", { name: "Scan my scorecard" })).toBeVisible();
    return this;
  }

  /** The picked photo, shown as a thumbnail with its name, ready to scan. */
  async seesChosenCard(): Promise<this> {
    await expect(this.page.getByText(CARD_NAME)).toBeVisible();
    await expect(this.page.locator('img[src^="data:image/"]')).toBeVisible();
    return this;
  }

  /** The scan failed: the reason shows, and the photo is still there to try again. */
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

  /** The report was saved, its button spent, and it carried no file name. */
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

  /** Starts over from the scanned card. The button has to be on screen to be tapped. */
  async tapScanAnother(): Promise<this> {
    const button = this.page.getByRole("button", { name: "Scan another" });
    await expect(button).toBeInViewport();
    await button.click();
    return this;
  }

  /** The visitor's own card, read back as a scorecard under "Here's your round." */
  async seesScannedCard(): Promise<this> {
    await expect(this.page.getByRole("heading", { level: 1, name: "Here’s your round." })).toBeVisible();
    // The course leads the scorecard's course line, before where it is.
    await expect(this.page.getByText(`${SCANNED_COURSE_NAME} ·`, { exact: false })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Scan another" })).toBeVisible();
    return this;
  }

  async goesTo(path: string): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`${path}$`));
    return this;
  }

  /** The nav's Sign up; Sign up free beside Try it or under the scanned round; a phone's "or sign up free". */
  async tapSignUp(name: "Sign up" | "Sign up free" | "sign up free" = "Sign up"): Promise<this> {
    await this.page.getByRole("link", { name, exact: true }).click();
    return this;
  }

  async capture(name: string): Promise<this> {
    // Tapping into the card scrolls the page; capture from the top.
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
