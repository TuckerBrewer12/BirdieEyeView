import { fileURLToPath } from "node:url";
import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { expectTheme } from "../../../testing/theme";
import type { ScanResult } from "../../../types/scan";

const SCORECARD_FILE = fileURLToPath(new URL("./scorecard.pdf", import.meta.url));

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

/** A finished card, so extract can land on the review instead of an empty body. */
const EXTRACTED_SCORECARD: ScanResult = {
  round: {
    course: {
      name: "Pebble Beach",
      location: "Pebble Beach, CA",
      par: 72,
      holes: PARS.map((par, index) => ({ number: index + 1, par, handicap: index + 1 })),
      tees: [],
    },
    tee_box: "Blue",
    date: null,
    hole_scores: PARS.map((par, index) => ({
      hole_number: index + 1,
      strokes: par + 1,
      putts: null,
      shots_to_green: null,
      fairway_hit: null,
      green_in_regulation: null,
    })),
    notes: null,
  },
  confidence: { overall: 1, level: "high", hole_scores: [] },
  fields_needing_review: [],
};

/** Screen robot for the logged-out landing page at `/`. */
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

  async open(): Promise<this> {
    // The hero's scan loop is decoration and holds on step one under reduced
    // motion. Emulating it here is what makes the page deterministic enough to
    // have a baseline — `test.use({ reducedMotion })` does not reach the page.
    await this.page.emulateMedia({ reducedMotion: "reduce" });
    await FakeSession.install(this.page, { signedOut: true });
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

  async openMenu(): Promise<this> {
    await this.page.getByRole("button", { name: "Toggle menu" }).click();
    return this;
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

  /** The upload drop zone sits in the first screen, not below the fold. */
  async seesScanner(): Promise<this> {
    await expect(this.page.getByText("Upload a scorecard photo")).toBeInViewport();
    return this;
  }

  /** The sample scan beside the uploader. It stays until a real scan starts. */
  async seesDemo(): Promise<this> {
    await expect(
      this.page.getByRole("img", { name: "A paper golf scorecard being scanned" }),
    ).toBeVisible();
    return this;
  }

  async doesNotSeeDemo(): Promise<this> {
    await expect(
      this.page.getByRole("img", { name: "A paper golf scorecard being scanned" }),
    ).toHaveCount(0);
    return this;
  }

  /** Drops a scorecard on the uploader. Still the upload step, so the demo stays. */
  async chooseScorecard(): Promise<this> {
    await this.page.locator('input[type="file"]').setInputFiles(SCORECARD_FILE);
    await expect(this.page.getByRole("button", { name: "Scan My Scorecard" })).toBeVisible();
    return this;
  }

  /**
   * Starts the scan. Extract is answered with a finished card so the review
   * can render; the demo steps aside as soon as this leaves upload.
   */
  async tapScan(): Promise<this> {
    await this.page.route("**/api/scan/extract", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EXTRACTED_SCORECARD),
      });
    });
    await this.page.getByRole("button", { name: "Scan My Scorecard" }).click();
    return this;
  }

  /** The visitor's own card, once extract has finished. */
  async seesReview(): Promise<this> {
    await expect(this.page.getByText("Pebble Beach", { exact: true })).toBeVisible();
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
    await expect(this.page).toHaveScreenshot(name, { fullPage: true });
    return this;
  }
}

export const test = base.extend<{ landing: LandingRobot }>({
  landing: async ({ page }, provide) => {
    await provide(new LandingRobot(page));
  },
});
