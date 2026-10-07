import { type Page } from "@playwright/test";
import { test as base, expect } from "../../../testing/playwright";
import { FakeSession } from "../../../testing/fakes/FakeSession";
import { expectTheme } from "../../../testing/theme";

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
